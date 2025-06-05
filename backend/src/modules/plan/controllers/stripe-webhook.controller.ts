import { Controller, Get, Query, UseGuards, BadRequestException, Req } from '@nestjs/common';
import { TokenAuthGuard } from '../../auth/guards/token-auth.guard';
import { StripeWebhookService } from '../services/stripe-webhook.service';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';

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
}