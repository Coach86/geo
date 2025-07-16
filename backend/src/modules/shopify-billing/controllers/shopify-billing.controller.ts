import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ShopifyAuthGuard } from '../../auth/guards/shopify-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ShopifyBillingService } from '../services/shopify-billing.service';
import { OrganizationService } from '../../organization/services/organization.service';
import { PlanService } from '../../plan/services/plan.service';
import {
  CreateSubscriptionDto,
  ActivateChargeDto,
  CreateUsageChargeDto,
} from '../dto/create-subscription.dto';
import { CreatePlanSubscriptionDto } from '../dto/create-plan-subscription.dto';
import {
  SubscriptionResponseDto,
  UsageChargeResponseDto,
  BillingStatusResponseDto,
} from '../dto/subscription-response.dto';

@ApiTags('shopify-billing')
@Controller('shopify-billing')
export class ShopifyBillingController {
  private readonly logger = new Logger(ShopifyBillingController.name);

  constructor(
    private readonly shopifyBillingService: ShopifyBillingService,
    private readonly configService: ConfigService,
    private readonly organizationService: OrganizationService,
    private readonly planService: PlanService,
  ) {}

  private async getShopifyConfig(organizationId: string) {
    this.logger.log(`Getting Shopify config for organization: ${organizationId}`);
    
    // Use findOneRaw to get the full access token for internal use
    const organization = await this.organizationService.findOneRaw(organizationId);
    
    if (!organization) {
      this.logger.error(`Organization not found: ${organizationId}`);
      throw new BadRequestException('Organization not found');
    }

    this.logger.log(`Organization found:`, {
      id: organization.id,
      name: organization.name,
      hasShopifyDomain: !!organization.shopifyShopDomain,
      hasShopifyToken: !!organization.shopifyAccessToken,
      shopifyDomain: organization.shopifyShopDomain,
      tokenLength: organization.shopifyAccessToken ? organization.shopifyAccessToken.length : 0,
      tokenPrefix: organization.shopifyAccessToken ? organization.shopifyAccessToken.substring(0, 10) : 'none',
    });

    if (!organization.shopifyShopDomain || !organization.shopifyAccessToken) {
      throw new BadRequestException('Shopify is not configured for this organization. Please complete the Shopify OAuth flow.');
    }

    return { 
      shop: organization.shopifyShopDomain, 
      accessToken: organization.shopifyAccessToken 
    };
  }

  @Post('subscription')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subscription for the user\'s organization' })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subscription created successfully',
    type: SubscriptionResponseDto,
  })
  async createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @CurrentUser() user: any,
  ): Promise<SubscriptionResponseDto> {
    // Regular users create subscriptions for their own organization
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User must belong to an organization');
    }
    const { shop, accessToken } = await this.getShopifyConfig(organizationId);
    
    const charge = await this.shopifyBillingService.createRecurringCharge(
      shop,
      accessToken,
      {
        name: createSubscriptionDto.name,
        price: createSubscriptionDto.price,
        returnUrl: `${process.env.APP_URL}/api/billing/callback?shop=${encodeURIComponent(shop)}`,
        trialDays: createSubscriptionDto.trialDays,
        test: createSubscriptionDto.test,
        currency: createSubscriptionDto.currency,
      },
    );

    return {
      id: charge.id.toString(),
      name: charge.name,
      price: parseFloat(charge.price),
      currency: charge.currency,
      status: charge.status,
      interval: 'monthly', // Shopify recurring charges are always monthly
      trialDays: charge.trial_days,
      trialEndsOn: charge.trial_ends_on,
      activatedOn: charge.activated_on,
      cancelledOn: charge.cancelled_on,
      test: charge.test,
      createdAt: charge.created_at,
      updatedAt: charge.updated_at,
      confirmationUrl: charge.confirmation_url,
    };
  }

  @Post('subscription/plan')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a subscription from a plan template' })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subscription created successfully',
    type: SubscriptionResponseDto,
  })
  async createPlanSubscription(
    @Body() createPlanSubscriptionDto: CreatePlanSubscriptionDto,
    @CurrentUser() user: any,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Creating plan subscription`, {
      planId: createPlanSubscriptionDto.planId,
      interval: createPlanSubscriptionDto.interval,
      userId: user.id,
      organizationId: user.organizationId,
    });

    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User must belong to an organization');
    }
    
    // Get the plan details
    if (createPlanSubscriptionDto.planId === 'manual') {
      throw new BadRequestException('Invalid plan ID');
    }
    const plan = await this.planService.findById(createPlanSubscriptionDto.planId);
    if (!plan) {
      this.logger.error(`Plan not found: ${createPlanSubscriptionDto.planId}`);
      throw new BadRequestException('Plan not found');
    }

    this.logger.log(`Found plan:`, {
      planId: plan.id,
      planName: plan.name,
      planNameType: typeof plan.name,
      planNameLength: plan.name?.length,
      shopifyMonthlyPrice: plan.shopifyMonthlyPrice,
      shopifyAnnualPrice: plan.shopifyAnnualPrice,
      planObject: JSON.stringify(plan, null, 2),
    });

    // Determine the price based on interval
    let price: number;
    if (createPlanSubscriptionDto.interval === 'annual') {
      if (!plan.shopifyAnnualPrice) {
        throw new BadRequestException('This plan does not support annual billing');
      }
      price = plan.shopifyAnnualPrice;
    } else {
      if (!plan.shopifyMonthlyPrice) {
        throw new BadRequestException('This plan does not support monthly billing');
      }
      price = plan.shopifyMonthlyPrice;
    }

    const { shop, accessToken } = await this.getShopifyConfig(organizationId);
    
    // Use GraphQL for annual billing, REST API for monthly
    if (createPlanSubscriptionDto.interval === 'annual') {
      const returnUrl = `${process.env.APP_URL}/api/billing/callback?shop=${encodeURIComponent(shop)}`;
      this.logger.log(`Creating annual subscription with return URL: ${returnUrl}`);
      
      const result = await this.shopifyBillingService.createAppSubscription(
        shop,
        accessToken,
        {
          name: plan.name,
          price: price,
          interval: 'ANNUAL',
          returnUrl: returnUrl,
          trialDays: plan.shopifyTrialDays,
          test: createPlanSubscriptionDto.test || false,
          currencyCode: 'USD',
        },
      );

      return {
        id: result.subscription.id,
        name: result.subscription.name,
        price: price,
        currency: 'USD',
        status: result.subscription.status,
        interval: 'annual',
        trialDays: result.subscription.trialDays,
        trialEndsOn: undefined, // GraphQL response structure is different
        activatedOn: undefined,
        cancelledOn: undefined,
        test: result.subscription.test,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confirmationUrl: result.confirmationUrl,
      };
    } else {
      // Use REST API for monthly billing
      const returnUrl = `${process.env.APP_URL}/api/billing/callback?shop=${encodeURIComponent(shop)}`;
      this.logger.log(`BEFORE SHOPIFY API CALL - Monthly subscription:`, {
        planName: plan.name,
        planNameType: typeof plan.name,
        price: price,
        trialDays: plan.shopifyTrialDays,
        shop: shop,
        returnUrl: returnUrl,
      });
      
      const charge = await this.shopifyBillingService.createRecurringCharge(
        shop,
        accessToken,
        {
          name: plan.name,
          price: price,
          returnUrl: returnUrl,
          trialDays: plan.shopifyTrialDays,
          test: createPlanSubscriptionDto.test || false,
          currency: 'USD',
        },
      );

      return {
        id: charge.id.toString(),
        name: charge.name,
        price: parseFloat(charge.price),
        currency: charge.currency,
        status: charge.status,
        interval: 'monthly',
        trialDays: charge.trial_days,
        trialEndsOn: charge.trial_ends_on,
        activatedOn: charge.activated_on,
        cancelledOn: charge.cancelled_on,
        test: charge.test,
        createdAt: charge.created_at,
        updatedAt: charge.updated_at,
        confirmationUrl: charge.confirmation_url,
      };
    }
  }

  @Post('subscription/:chargeId/activate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a recurring charge after merchant approval' })
  @ApiBearerAuth()
  @ApiParam({ name: 'chargeId', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription activated successfully',
    type: SubscriptionResponseDto,
  })
  async activateSubscription(
    @Param('chargeId') chargeId: number,
    @CurrentUser() user: any,
  ): Promise<SubscriptionResponseDto> {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User must belong to an organization');
    }
    const { shop, accessToken } = await this.getShopifyConfig(organizationId);
    
    const charge = await this.shopifyBillingService.activateRecurringCharge(
      shop,
      accessToken,
      chargeId,
    );

    return {
      id: charge.id.toString(),
      name: charge.name,
      price: parseFloat(charge.price),
      currency: charge.currency,
      status: charge.status,
      interval: 'monthly',
      trialDays: charge.trial_days,
      trialEndsOn: charge.trial_ends_on,
      activatedOn: charge.activated_on,
      cancelledOn: charge.cancelled_on,
      test: charge.test,
      createdAt: charge.created_at,
      updatedAt: charge.updated_at,
    };
  }

  @Delete('subscription/:chargeId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a recurring charge' })
  @ApiBearerAuth()
  @ApiParam({ name: 'chargeId', type: 'number' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Subscription cancelled successfully',
  })
  async cancelSubscription(
    @Param('chargeId') chargeId: number,
    @CurrentUser() user: any,
  ): Promise<void> {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User must belong to an organization');
    }
    const { shop, accessToken } = await this.getShopifyConfig(organizationId);
    
    await this.shopifyBillingService.cancelRecurringCharge(
      shop,
      accessToken,
      chargeId,
    );
  }

  @Get('subscription/:chargeId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a specific subscription' })
  @ApiBearerAuth()
  @ApiParam({ name: 'chargeId', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription details',
    type: SubscriptionResponseDto,
  })
  async getSubscription(
    @Param('chargeId') chargeId: number,
    @CurrentUser() user: any,
  ): Promise<SubscriptionResponseDto> {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User must belong to an organization');
    }
    const { shop, accessToken } = await this.getShopifyConfig(organizationId);
    
    const charge = await this.shopifyBillingService.getRecurringCharge(
      shop,
      accessToken,
      chargeId,
    );

    return {
      id: charge.id.toString(),
      name: charge.name,
      price: parseFloat(charge.price),
      currency: charge.currency,
      status: charge.status,
      interval: 'monthly',
      trialDays: charge.trial_days,
      trialEndsOn: charge.trial_ends_on,
      activatedOn: charge.activated_on,
      cancelledOn: charge.cancelled_on,
      test: charge.test,
      createdAt: charge.created_at,
      updatedAt: charge.updated_at,
    };
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all subscriptions' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'status', required: false, type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of subscriptions',
    type: [SubscriptionResponseDto],
  })
  async listSubscriptions(
    @Query('status') status: string,
    @CurrentUser() user: any,
  ): Promise<SubscriptionResponseDto[]> {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User must belong to an organization');
    }
    const { shop, accessToken } = await this.getShopifyConfig(organizationId);
    
    const charges = await this.shopifyBillingService.listRecurringCharges(
      shop,
      accessToken,
      status,
    );

    return charges.map(charge => ({
      id: charge.id.toString(),
      name: charge.name,
      price: parseFloat(charge.price),
      currency: charge.currency,
      status: charge.status,
      interval: 'monthly',
      trialDays: charge.trial_days,
      trialEndsOn: charge.trial_ends_on,
      activatedOn: charge.activated_on,
      cancelledOn: charge.cancelled_on,
      test: charge.test,
      createdAt: charge.created_at,
      updatedAt: charge.updated_at,
    }));
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get billing status' })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Billing status',
    type: BillingStatusResponseDto,
  })
  async getBillingStatus(
    @CurrentUser() user: any,
  ): Promise<BillingStatusResponseDto> {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User must belong to an organization');
    }
    
    const { shop, accessToken } = await this.getShopifyConfig(organizationId);
    
    const activeSubscription = await this.shopifyBillingService.getActiveSubscription(
      shop,
      accessToken,
    );
    
    const allSubscriptions = await this.shopifyBillingService.listRecurringCharges(
      shop,
      accessToken,
    );

    const subscriptionDtos = allSubscriptions.map(charge => ({
      id: charge.id.toString(),
      name: charge.name,
      price: parseFloat(charge.price),
      currency: charge.currency,
      status: charge.status,
      interval: 'monthly' as const,
      trialDays: charge.trial_days,
      trialEndsOn: charge.trial_ends_on,
      activatedOn: charge.activated_on,
      cancelledOn: charge.cancelled_on,
      test: charge.test,
      createdAt: charge.created_at,
      updatedAt: charge.updated_at,
    }));

    return {
      hasActiveSubscription: !!activeSubscription,
      currentPlan: activeSubscription ? {
        id: activeSubscription.id.toString(),
        name: activeSubscription.name,
        price: parseFloat(activeSubscription.price),
        currency: activeSubscription.currency,
        status: activeSubscription.status,
        interval: 'monthly',
        trialDays: activeSubscription.trial_days,
        trialEndsOn: activeSubscription.trial_ends_on,
        activatedOn: activeSubscription.activated_on,
        cancelledOn: activeSubscription.cancelled_on,
        test: activeSubscription.test,
        createdAt: activeSubscription.created_at,
        updatedAt: activeSubscription.updated_at,
      } : undefined,
      subscriptions: subscriptionDtos,
      shop,
    };
  }

  @Post('usage-charge/:recurringChargeId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a usage charge' })
  @ApiBearerAuth()
  @ApiParam({ name: 'recurringChargeId', type: 'number' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Usage charge created successfully',
    type: UsageChargeResponseDto,
  })
  async createUsageCharge(
    @Param('recurringChargeId') recurringChargeId: number,
    @Body() createUsageChargeDto: CreateUsageChargeDto,
    @CurrentUser() user: any,
  ): Promise<UsageChargeResponseDto> {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User must belong to an organization');
    }
    const { shop, accessToken } = await this.getShopifyConfig(organizationId);
    
    const usageCharge = await this.shopifyBillingService.createUsageCharge(
      shop,
      accessToken,
      recurringChargeId,
      createUsageChargeDto.description,
      createUsageChargeDto.price,
    );

    return {
      id: usageCharge.id,
      description: usageCharge.description,
      price: usageCharge.price,
      currency: usageCharge.currency,
      balanceUsed: usageCharge.balance_used,
      balanceRemaining: usageCharge.balance_remaining,
      createdAt: usageCharge.created_at,
      updatedAt: usageCharge.updated_at,
    };
  }

  @Get('usage-charges/:recurringChargeId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get usage charges for a subscription' })
  @ApiBearerAuth()
  @ApiParam({ name: 'recurringChargeId', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of usage charges',
    type: [UsageChargeResponseDto],
  })
  async getUsageCharges(
    @Param('recurringChargeId') recurringChargeId: number,
    @CurrentUser() user: any,
  ): Promise<UsageChargeResponseDto[]> {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User must belong to an organization');
    }
    const { shop, accessToken } = await this.getShopifyConfig(organizationId);
    
    const usageCharges = await this.shopifyBillingService.getUsageCharges(
      shop,
      accessToken,
      recurringChargeId,
    );

    return usageCharges.map(charge => ({
      id: charge.id,
      description: charge.description,
      price: charge.price,
      currency: charge.currency,
      balanceUsed: charge.balance_used,
      balanceRemaining: charge.balance_remaining,
      createdAt: charge.created_at,
      updatedAt: charge.updated_at,
    }));
  }

}