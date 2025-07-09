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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ShopifyAuthGuard } from '../../auth/guards/shopify-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ShopifyBillingService } from '../services/shopify-billing.service';
import {
  CreateSubscriptionDto,
  ActivateChargeDto,
  CreateUsageChargeDto,
} from '../dto/create-subscription.dto';
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
  ) {}

  @Post('subscription')
  @UseGuards(ShopifyAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subscription created successfully',
    type: SubscriptionResponseDto,
  })
  async createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @Req() req: Request,
  ): Promise<SubscriptionResponseDto> {
    const { shop, accessToken } = (req as any).shopifySession;
    
    const charge = await this.shopifyBillingService.createRecurringCharge(
      shop,
      accessToken,
      {
        name: createSubscriptionDto.name,
        price: createSubscriptionDto.price,
        returnUrl: `${process.env.APP_URL}/billing/callback`,
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

  @Post('subscription/:chargeId/activate')
  @UseGuards(ShopifyAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a recurring charge after merchant approval' })
  @ApiParam({ name: 'chargeId', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription activated successfully',
    type: SubscriptionResponseDto,
  })
  async activateSubscription(
    @Param('chargeId') chargeId: number,
    @Req() req: Request,
  ): Promise<SubscriptionResponseDto> {
    const { shop, accessToken } = (req as any).shopifySession;
    
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
  @UseGuards(ShopifyAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a recurring charge' })
  @ApiParam({ name: 'chargeId', type: 'number' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Subscription cancelled successfully',
  })
  async cancelSubscription(
    @Param('chargeId') chargeId: number,
    @Req() req: Request,
  ): Promise<void> {
    const { shop, accessToken } = (req as any).shopifySession;
    
    await this.shopifyBillingService.cancelRecurringCharge(
      shop,
      accessToken,
      chargeId,
    );
  }

  @Get('subscription/:chargeId')
  @UseGuards(ShopifyAuthGuard)
  @ApiOperation({ summary: 'Get a specific subscription' })
  @ApiParam({ name: 'chargeId', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription details',
    type: SubscriptionResponseDto,
  })
  async getSubscription(
    @Param('chargeId') chargeId: number,
    @Req() req: Request,
  ): Promise<SubscriptionResponseDto> {
    const { shop, accessToken } = (req as any).shopifySession;
    
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
  @UseGuards(ShopifyAuthGuard)
  @ApiOperation({ summary: 'List all subscriptions' })
  @ApiQuery({ name: 'status', required: false, type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of subscriptions',
    type: [SubscriptionResponseDto],
  })
  async listSubscriptions(
    @Query('status') status: string,
    @Req() req: Request,
  ): Promise<SubscriptionResponseDto[]> {
    const { shop, accessToken } = (req as any).shopifySession;
    
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
  @UseGuards(ShopifyAuthGuard)
  @ApiOperation({ summary: 'Get billing status for the current shop' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Billing status',
    type: BillingStatusResponseDto,
  })
  async getBillingStatus(
    @Req() req: Request,
  ): Promise<BillingStatusResponseDto> {
    const { shop, accessToken } = (req as any).shopifySession;
    
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
  @UseGuards(ShopifyAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a usage charge' })
  @ApiParam({ name: 'recurringChargeId', type: 'number' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Usage charge created successfully',
    type: UsageChargeResponseDto,
  })
  async createUsageCharge(
    @Param('recurringChargeId') recurringChargeId: number,
    @Body() createUsageChargeDto: CreateUsageChargeDto,
    @Req() req: Request,
  ): Promise<UsageChargeResponseDto> {
    const { shop, accessToken } = (req as any).shopifySession;
    
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
  @UseGuards(ShopifyAuthGuard)
  @ApiOperation({ summary: 'Get usage charges for a subscription' })
  @ApiParam({ name: 'recurringChargeId', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of usage charges',
    type: [UsageChargeResponseDto],
  })
  async getUsageCharges(
    @Param('recurringChargeId') recurringChargeId: number,
    @Req() req: Request,
  ): Promise<UsageChargeResponseDto[]> {
    const { shop, accessToken } = (req as any).shopifySession;
    
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