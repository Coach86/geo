import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PlanRepository } from '../repositories/plan.repository';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { PlanResponseDto, PlanPriceDto } from '../dto/plan-response.dto';
import { PlanDocument } from '../schemas/plan.schema';

@Injectable()
export class PlanService {
  private stripe: Stripe;

  constructor(
    private readonly planRepository: PlanRepository,
    private readonly configService: ConfigService,
  ) {
    const stripeApiKey = this.configService.get<string>('STRIPE_API_KEY');
    if (stripeApiKey) {
      this.stripe = new Stripe(stripeApiKey, {
        apiVersion: '2025-04-30.basil',
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

    const session = await this.stripe.checkout.sessions.create({
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
    });

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
      features: plan.features,
      included: plan.included,
      stripeProductId: plan.stripeProductId,
      maxModels: plan.maxModels,
      maxProjects: plan.maxProjects,
      maxUrls: plan.maxUrls,
      maxSpontaneousPrompts: plan.maxSpontaneousPrompts,
      maxCompetitors: plan.maxCompetitors,
      isActive: plan.isActive,
      isRecommended: plan.isRecommended,
      isMostPopular: plan.isMostPopular,
      order: plan.order,
      metadata: plan.metadata,
      createdAt: (plan as any).createdAt,
      updatedAt: (plan as any).updatedAt,
    };
  }
}
