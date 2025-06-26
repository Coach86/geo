import { Controller, Get, Post, Query, Body, Headers, UseGuards, BadRequestException, Req, RawBodyRequest } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger';;
import { Request } from 'express';
import { TokenAuthGuard } from '../../auth/guards/token-auth.guard';
import { StripeWebhookService } from '../services/stripe-webhook.service';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { PublicRoute } from '../../auth/decorators/public-route.decorator';

@ApiTags('Public - Payments')
@Controller('public/stripe')
export class StripeWebhookController {
  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  @Get('verify-checkout')
  @TokenRoute()
  @UseGuards(TokenAuthGuard)
  async verifyCheckout(
    @Query('session_id') sessionId: string,
    @Req() req: any,
  ) {
    if (!sessionId) {
      throw new BadRequestException('Session ID is required');
    }

    const userId = req.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }

    const result = await this.stripeWebhookService.verifyCheckoutSession(sessionId, userId);
    return result;
  }

  @Post('webhook')
  @PublicRoute()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body is required for webhook verification');
    }

    try {
      await this.stripeWebhookService.handleWebhook(rawBody, signature);
      return { received: true };
    } catch (error) {
      throw new BadRequestException(`Webhook Error: ${error.message}`);
    }
  }
}