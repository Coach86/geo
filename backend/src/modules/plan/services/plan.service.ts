import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { PlanRepository } from '../repositories/plan.repository';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { PlanResponseDto, PlanPriceDto } from '../dto/plan-response.dto';
import { PlanDocument } from '../schemas/plan.schema';
import { UserService } from '../../user/services/user.service';
import { OrganizationService } from '../../organization/services/organization.service';
import { PromoCodeService } from '../../promo/services/promo-code.service';
import { DiscountType } from '../../promo/schemas/promo-code.schema';
import { SendSubscriptionCancelledEmailEvent } from '../../email/events/email.events';
import { PostHogService } from '../../analytics/services/posthog.service';

// Extended Stripe Subscription type to include current_period_end
interface StripeSubscriptionWithPeriodEnd extends Stripe.Subscription {
  current_period_end?: number;
}

@Injectable()
export class PlanService {
  private stripe: Stripe;

  constructor(
    private readonly planRepository: PlanRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    @Inject(forwardRef(() => OrganizationService)) private readonly organizationService: OrganizationService,
    @Inject(forwardRef(() => PromoCodeService)) private readonly promoCodeService: PromoCodeService,
    private readonly postHogService: PostHogService,
  ) {
    const stripeApiKey = this.configService.get<string>('STRIPE_API_KEY');
    if (stripeApiKey) {
      this.stripe = new Stripe(stripeApiKey, {
        apiVersion: '2025-06-30.basil',
      });
    }
  }

  async create(createPlanDto: CreatePlanDto): Promise<PlanResponseDto> {
    const plan = await this.planRepository.create(createPlanDto);
    return this.mapPlanToResponse(plan);
  }

  async findAll(includeInactive = false): Promise<PlanResponseDto[]> {
    const plans = includeInactive
      ? await this.planRepository.findAllIncludingInactive()
      : await this.planRepository.findAll();

    const plansWithPrices = await Promise.all(
      plans.map(async (plan) => {
        const response = this.mapPlanToResponse(plan);
        try {
          response.prices = await this.getStripePrices(plan.stripeProductId);
        } catch (error) {
          console.error(`Failed to fetch Stripe prices for plan ${plan.name}:`, error);
        }
        return response;
      }),
    );

    return plansWithPrices;
  }

  async findById(id: string): Promise<PlanResponseDto> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    const response = this.mapPlanToResponse(plan);
    try {
      response.prices = await this.getStripePrices(plan.stripeProductId);
    } catch (error) {
      console.error(`Failed to fetch Stripe prices for plan ${plan.name}:`, error);
    }

    return response;
  }

  async update(id: string, updatePlanDto: UpdatePlanDto): Promise<PlanResponseDto> {
    const plan = await this.planRepository.update(id, updatePlanDto);
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }
    return this.mapPlanToResponse(plan);
  }

  async delete(id: string): Promise<void> {
    const result = await this.planRepository.delete(id);
    if (!result) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }
  }

  async getStripeProducts(): Promise<Stripe.Product[]> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const products = await this.stripe.products.list({
      active: true,
      limit: 100,
    });

    return products.data;
  }

  async createUserCheckoutSession(
    planId: string,
    userId: string,
    billingPeriod: 'monthly' | 'yearly',
  ): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${planId} not found`);
    }

    const prices = await this.stripe.prices.list({
      product: plan.stripeProductId,
      active: true,
    });

    const targetPrice = prices.data.find(
      (price: Stripe.Price) =>
        price.recurring?.interval === (billingPeriod === 'yearly' ? 'year' : 'month'),
    );

    if (!targetPrice) {
      throw new NotFoundException(`No ${billingPeriod} price found for this plan`);
    }

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [
        {
          price: targetPrice.id,
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId,
        planId: planId,
        billingPeriod: billingPeriod,
      },
      success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cancel`,
    };

    // Check if user's organization has a promo code with trial days
    try {
      const user = await this.userService.findOne(userId);
      if (user && user.organizationId) {
        const organization = await this.organizationService.findOne(user.organizationId);
        if (organization && organization.promoCode) {
          // Get promo code details (without usage validation)
          const promo = await this.promoCodeService.findByCode(organization.promoCode);
          
          if (promo && promo.isActive) {
            // For trial_days promo codes, check if this plan matches the trialPlanId
            let isValidForPlan = false;
            
            if (promo.discountType === DiscountType.TRIAL_DAYS) {
              // Use trialPlanId for trial_days type promos
              isValidForPlan = promo.trialPlanId === planId;
            } else {
              // For other promo types, use validPlanIds
              isValidForPlan = !promo.validPlanIds || 
                             promo.validPlanIds.length === 0 || 
                             promo.validPlanIds.includes(planId);
            }
            
            // Apply trial days if promo code provides them and is valid for this plan
            if (isValidForPlan && promo.discountType === DiscountType.TRIAL_DAYS && promo.discountValue > 0) {
              sessionConfig.subscription_data = {
                trial_period_days: promo.discountValue,
                metadata: {
                  promoCode: organization.promoCode,
                  organizationId: user.organizationId,
                },
              };
              console.log(`Applied ${promo.discountValue} trial days from promo code ${organization.promoCode} for user ${userId}`);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error checking promo code for user ${userId}:`, error);
      // Continue without promo code if there's an error
    }

    // Allow promotion codes for all environments
    sessionConfig.allow_promotion_codes = true;

    const session = await this.stripe.checkout.sessions.create(sessionConfig);

    if (!session.url) {
      throw new BadRequestException('Failed to create checkout session');
    }

    return { url: session.url };
  }

  private async getStripePrices(productId: string): Promise<PlanPriceDto> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const prices = await this.stripe.prices.list({
      product: productId,
      active: true,
    });

    const monthlyPrice = prices.data.find(
      (price: Stripe.Price) => price.recurring?.interval === 'month',
    );
    const yearlyPrice = prices.data.find(
      (price: Stripe.Price) => price.recurring?.interval === 'year',
    );

    return {
      monthly: monthlyPrice?.unit_amount ? monthlyPrice.unit_amount / 100 : 0,
      yearly: yearlyPrice?.unit_amount ? yearlyPrice.unit_amount / 100 : 0,
      currency: monthlyPrice?.currency || 'usd',
    };
  }

  private mapPlanToResponse(plan: PlanDocument): PlanResponseDto {
    return {
      id: plan._id ? plan._id.toString() : plan.id,
      name: plan.name,
      tag: plan.tag,
      subtitle: plan.subtitle,
      included: plan.included,
      stripeProductId: plan.stripeProductId,
      maxModels: plan.maxModels,
      maxProjects: plan.maxProjects,
      maxUrls: plan.maxUrls,
      maxUsers: plan.maxUsers,
      maxSpontaneousPrompts: plan.maxSpontaneousPrompts,
      maxCompetitors: plan.maxCompetitors,
      isActive: plan.isActive,
      isRecommended: plan.isRecommended,
      isMostPopular: plan.isMostPopular,
      order: plan.order,
      metadata: plan.metadata,
      refreshFrequency: plan.refreshFrequency || 'weekly',
      shopifyMonthlyPrice: plan.shopifyMonthlyPrice,
      shopifyAnnualPrice: plan.shopifyAnnualPrice,
      shopifyTrialDays: plan.shopifyTrialDays,
      createdAt: (plan as any).createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: (plan as any).updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  async findFreePlan(): Promise<PlanResponseDto | null> {
    // Find the free plan by name or tag or metadata
    const plans = await this.planRepository.findAll();
    const freePlan = plans.find(
      plan => plan.name.toLowerCase() === 'free' || 
              plan.tag?.toLowerCase() === 'free' ||
              plan.metadata?.isFree === true ||
              plan.stripeProductId === null || 
              plan.stripeProductId === ''
    );
    
    if (!freePlan) {
      return null;
    }
    
    return this.mapPlanToResponse(freePlan);
  }


  async cancelUserSubscription(userId: string): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    // Get user and organization
    const user = await this.userService.findOne(userId);
    if (!user || !user.organizationId) {
      throw new NotFoundException('User or organization not found');
    }

    const organization = await this.organizationService.findOne(user.organizationId);
    if (!organization.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription found');
    }

    try {
      // Cancel the subscription at the end of the billing period
      const updatedSubscription = await this.stripe.subscriptions.update(organization.stripeSubscriptionId, {
        cancel_at_period_end: true,
      }) as StripeSubscriptionWithPeriodEnd;

      // Update organization subscription status and cancel date
      await this.organizationService.update(user.organizationId, {
        subscriptionStatus: 'canceling',
        subscriptionCancelAt: updatedSubscription.cancel_at 
          ? new Date(updatedSubscription.cancel_at * 1000)
          : undefined,
      });

      console.log(`Subscription ${organization.stripeSubscriptionId} marked for cancellation for user ${userId}`);

      // Track subscription cancellation in PostHog
      await this.postHogService.track(userId, 'subscription_cancelled', {
        organizationId: organization.id,
        organizationName: organization.name,
        subscriptionId: organization.stripeSubscriptionId,
        planId: organization.stripePlanId,
        cancelAt: updatedSubscription.cancel_at ? new Date(updatedSubscription.cancel_at * 1000).toISOString() : undefined,
        currentPeriodEnd: updatedSubscription.current_period_end ? new Date(updatedSubscription.current_period_end * 1000).toISOString() : undefined,
      });

      // Send cancellation confirmation email
      if (updatedSubscription.cancel_at_period_end) {
        // Get the current plan name based on subscription
        let planName = 'Pro'; // Default plan name
        
        // Try to get the plan name from the subscription's price metadata
        if (updatedSubscription.items && updatedSubscription.items.data.length > 0) {
          const priceId = updatedSubscription.items.data[0].price.id;
          try {
            const price = await this.stripe.prices.retrieve(priceId, {
              expand: ['product']
            });
            if (price.product && typeof price.product === 'object' && 'name' in price.product) {
              planName = price.product.name;
            }
          } catch (error) {
            console.log('Could not retrieve price details, using default plan name');
          }
        }
        
        // Get the end date (when the subscription will actually end)
        const currentPeriodEnd = updatedSubscription.current_period_end;
        const endDate = currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : new Date();
        
        console.log('Subscription cancel details:', {
          current_period_end: currentPeriodEnd,
          endDate: endDate.toISOString(),
          isValidDate: !isNaN(endDate.getTime()),
        });
        
        // Emit event to send cancellation email
        this.eventEmitter.emit(
          'email.subscription-cancelled',
          new SendSubscriptionCancelledEmailEvent(
            user.email,
            user.email, // Use email as name since user doesn't have a name field
            planName,
            endDate,
          ),
        );
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new BadRequestException('Failed to cancel subscription');
    }
  }
}
