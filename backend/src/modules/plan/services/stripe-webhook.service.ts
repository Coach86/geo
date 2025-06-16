import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { OrganizationService } from '../../organization/services/organization.service';
import { PlanService } from './plan.service';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class StripeWebhookService {
  private stripe: Stripe;
  private webhookSecret: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly organizationService: OrganizationService,
    private readonly planService: PlanService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const stripeApiKey = this.configService.get<string>('STRIPE_API_KEY');
    if (stripeApiKey) {
      this.stripe = new Stripe(stripeApiKey, {
        apiVersion: '2025-05-28.basil',
      });
    }
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
  }

  async verifyCheckoutSession(sessionId: string, userId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      // Retrieve the checkout session from Stripe
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });

      if (!session) {
        throw new NotFoundException('Checkout session not found');
      }

      // Verify the session is completed
      if (session.payment_status !== 'paid') {
        throw new BadRequestException('Payment not completed');
      }

      // Get user and their organization
      const user = await this.userService.findOne(userId);
      if (!user || !user.organizationId) {
        throw new NotFoundException('User or organization not found');
      }

      // Get the plan details from session metadata
      const planId = session.metadata?.planId;
      if (!planId) {
        throw new BadRequestException('Plan information missing from session');
      }

      const plan = await this.planService.findById(planId);
      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      // Update organization with new plan settings
      const organizationId = user.organizationId.toString();

      // Extract customer ID from the session (it might be an object or string)
      const customerId = typeof session.customer === 'string'
        ? session.customer
        : (session.customer as Stripe.Customer)?.id;

      // Extract subscription ID from the session
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as Stripe.Subscription)?.id;

      // Update Stripe customer ID, plan ID, and subscription ID
      await this.organizationService.update(organizationId, {
        stripeCustomerId: customerId,
        stripePlanId: planId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: 'active',
      });

      // Update plan settings with plan limits
      await this.organizationService.updatePlanSettings(organizationId, {
        maxProjects: plan.maxProjects,
        maxAIModels: plan.maxModels,
        maxSpontaneousPrompts: plan.maxSpontaneousPrompts,
        maxUrls: plan.maxUrls,
        maxUsers: plan.maxUsers,
        maxCompetitors: plan.maxCompetitors,
      });

      console.log(`Successfully updated organization ${organizationId} with plan ${plan.name}`);

      // Emit event to trigger batch analysis
      this.eventEmitter.emit('plan.upgraded', {
        organizationId,
        planId: plan.id,
        planName: plan.name,
        userId: user.id,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `Your ${plan.name} plan has been activated successfully!`,
        plan: {
          name: plan.name,
          maxProjects: plan.maxProjects,
          maxModels: plan.maxModels,
          maxSpontaneousPrompts: plan.maxSpontaneousPrompts,
          maxUrls: plan.maxUrls,
          maxCompetitors: plan.maxCompetitors,
          maxUsers: plan.maxUsers,
        },
      };
    } catch (error) {
      console.error('Error verifying checkout session:', error);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to verify checkout session');
    }
  }

  async handleWebhook(body: Buffer, signature: string): Promise<void> {
    if (!this.stripe || !this.webhookSecret) {
      throw new BadRequestException('Stripe webhook is not configured');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature and construct event
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`Received webhook event: ${event.type}`);

    // Handle the event based on its type
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error handling webhook event ${event.type}:`, error);
      // Don't throw here - we still want to acknowledge receipt of the webhook
      // Stripe will retry if we return an error status
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    console.log('Handling subscription created:', subscription.id);
    
    // Find organization by Stripe customer ID
    const organization = await this.organizationService.findByStripeCustomerId(
      subscription.customer as string
    );
    
    if (!organization) {
      console.error('Organization not found for customer:', subscription.customer);
      // This might happen if webhook fires before checkout verification
      // Consider implementing retry logic here
      return;
    }

    // Check if this is the same subscription or a new one
    if (organization.stripeSubscriptionId && organization.stripeSubscriptionId !== subscription.id) {
      console.error(
        `Organization ${organization.id} already has subscription ${organization.stripeSubscriptionId}, ` +
        `but received created event for different subscription ${subscription.id}`
      );
      // This could happen if customer has multiple subscriptions or there's a data inconsistency
      return;
    }

    // Update subscription details (whether new or ensuring data consistency)
    await this.organizationService.update(organization.id, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    });

    console.log(`Updated organization ${organization.id} with subscription ${subscription.id}`);
    
    // If this is truly a new subscription (not set during checkout), emit event
    if (!organization.stripeSubscriptionId) {
      this.eventEmitter.emit('subscription.created', {
        organizationId: organization.id,
        subscriptionId: subscription.id,
        timestamp: new Date(),
      });
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    console.log('Handling subscription updated:', subscription.id);
    
    const organization = await this.organizationService.findByStripeCustomerId(
      subscription.customer as string
    );
    
    if (!organization) {
      console.error('Organization not found for customer:', subscription.customer);
      return;
    }

    // Update subscription status and period end
    await this.organizationService.update(organization.id, {
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    });

    // If subscription is past_due or unpaid, emit event
    if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      this.eventEmitter.emit('subscription.payment_issue', {
        organizationId: organization.id,
        status: subscription.status,
        timestamp: new Date(),
      });
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    console.log('Handling subscription deleted:', subscription.id);
    
    const organization = await this.organizationService.findByStripeCustomerId(
      subscription.customer as string
    );
    
    if (!organization) {
      console.error('Organization not found for customer:', subscription.customer);
      return;
    }

    // Reset to free plan when subscription is cancelled
    const freePlan = await this.planService.findFreeTrailPlan();
    if (!freePlan) {
      console.error('Free plan not found');
      return;
    }

    // Update organization to free plan
    await this.organizationService.update(organization.id, {
      stripePlanId: freePlan.id,
      stripeSubscriptionId: undefined,
      subscriptionStatus: 'canceled',
      subscriptionCurrentPeriodEnd: undefined,
    });

    // Update plan settings to free plan limits
    await this.organizationService.updatePlanSettings(organization.id, {
      maxProjects: freePlan.maxProjects,
      maxAIModels: freePlan.maxModels,
      maxSpontaneousPrompts: freePlan.maxSpontaneousPrompts,
      maxUrls: freePlan.maxUrls,
      maxUsers: freePlan.maxUsers,
      maxCompetitors: freePlan.maxCompetitors,
    });

    // Emit cancellation event
    this.eventEmitter.emit('subscription.cancelled', {
      organizationId: organization.id,
      previousPlanId: organization.stripePlanId,
      timestamp: new Date(),
    });

    console.log(`Organization ${organization.id} reverted to free plan due to subscription cancellation`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    console.log('Handling payment failed for invoice:', invoice.id);
    
    if (!(invoice as any).subscription) {
      return;
    }

    const organization = await this.organizationService.findByStripeCustomerId(
      invoice.customer as string
    );
    
    if (!organization) {
      console.error('Organization not found for customer:', invoice.customer);
      return;
    }

    // Emit payment failed event
    this.eventEmitter.emit('payment.failed', {
      organizationId: organization.id,
      invoiceId: invoice.id,
      amountDue: invoice.amount_due,
      attemptCount: invoice.attempt_count,
      nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null,
      timestamp: new Date(),
    });

    console.log(`Payment failed for organization ${organization.id}, attempt ${invoice.attempt_count}`);
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    console.log('Handling payment succeeded for invoice:', invoice.id);
    
    if (!(invoice as any).subscription) {
      return;
    }

    const organization = await this.organizationService.findByStripeCustomerId(
      invoice.customer as string
    );
    
    if (!organization) {
      console.error('Organization not found for customer:', invoice.customer);
      return;
    }

    // Update subscription status to active if it was previously past_due
    if (organization.subscriptionStatus === 'past_due' || organization.subscriptionStatus === 'unpaid') {
      await this.organizationService.update(organization.id, {
        subscriptionStatus: 'active',
      });

      // Emit payment recovered event
      this.eventEmitter.emit('payment.recovered', {
        organizationId: organization.id,
        invoiceId: invoice.id,
        timestamp: new Date(),
      });
    }

    console.log(`Payment succeeded for organization ${organization.id}`);
  }

  private async handleTrialWillEnd(subscription: Stripe.Subscription) {
    console.log('Handling trial will end:', subscription.id);
    
    const organization = await this.organizationService.findByStripeCustomerId(
      subscription.customer as string
    );
    
    if (!organization) {
      console.error('Organization not found for customer:', subscription.customer);
      return;
    }

    // Emit trial ending event
    this.eventEmitter.emit('trial.ending', {
      organizationId: organization.id,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      timestamp: new Date(),
    });

    console.log(`Trial ending soon for organization ${organization.id}`);
  }
}
