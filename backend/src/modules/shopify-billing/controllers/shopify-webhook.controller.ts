import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpStatus,
  HttpCode,
  Logger,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ShopifyWebhookService } from '../services/shopify-webhook.service';

@ApiTags('shopify-webhooks')
@Controller('shopify/webhooks')
export class ShopifyWebhookController {
  private readonly logger = new Logger(ShopifyWebhookController.name);

  constructor(
    private readonly shopifyWebhookService: ShopifyWebhookService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Shopify webhooks' })
  @ApiHeader({
    name: 'x-shopify-topic',
    description: 'Webhook topic',
    required: true,
  })
  @ApiHeader({
    name: 'x-shopify-shop-domain',
    description: 'Shop domain',
    required: true,
  })
  @ApiHeader({
    name: 'x-shopify-hmac-sha256',
    description: 'HMAC signature',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook signature',
  })
  async handleWebhook(
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Headers('x-shopify-hmac-sha256') signature: string,
    @Body() payload: any,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ success: boolean }> {
    if (!topic || !shop || !signature) {
      throw new BadRequestException('Missing required headers');
    }

    // Get raw body for signature verification
    const rawBody = req.rawBody?.toString('utf8');
    if (!rawBody) {
      throw new BadRequestException('Raw body not available');
    }

    try {
      await this.shopifyWebhookService.handleWebhook(
        topic,
        shop,
        payload,
        rawBody,
        signature,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      
      if (error.message === 'Invalid webhook signature') {
        throw new BadRequestException('Invalid webhook signature');
      }
      
      // Return success to prevent Shopify from retrying
      // Log the error for investigation
      return { success: true };
    }
  }

  @Post('app/uninstalled')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle app uninstall webhook' })
  async handleAppUninstalled(
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Headers('x-shopify-hmac-sha256') signature: string,
    @Body() payload: any,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ success: boolean }> {
    return this.handleWebhook(topic, shop, signature, payload, req);
  }

  @Post('subscriptions/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle subscription update webhook' })
  async handleSubscriptionUpdate(
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Headers('x-shopify-hmac-sha256') signature: string,
    @Body() payload: any,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ success: boolean }> {
    return this.handleWebhook(topic, shop, signature, payload, req);
  }

  @Post('subscriptions/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle subscription cancellation webhook' })
  async handleSubscriptionCancel(
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Headers('x-shopify-hmac-sha256') signature: string,
    @Body() payload: any,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ success: boolean }> {
    return this.handleWebhook(topic, shop, signature, payload, req);
  }

  @Post('compliance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle GDPR compliance webhooks' })
  async handleCompliance(
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Headers('x-shopify-hmac-sha256') signature: string,
    @Body() payload: any,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Received compliance webhook: ${topic} for shop: ${shop}`);
    
    // For now, just acknowledge receipt. In a real app, you would:
    // - customers/data_request: Export customer data
    // - customers/redact: Delete customer data
    // - shop/redact: Delete shop data after app uninstall
    
    return { success: true };
  }
}