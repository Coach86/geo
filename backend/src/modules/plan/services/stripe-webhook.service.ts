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
        apiVersion: '2025-04-30.basil',
      });
    }
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

      // Update Stripe customer ID and plan ID
      await this.organizationService.update(organizationId, {
        stripeCustomerId: customerId,
        stripePlanId: planId,
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
}
