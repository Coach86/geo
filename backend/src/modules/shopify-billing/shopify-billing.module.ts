import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ShopifyBillingService } from './services/shopify-billing.service';
import { ShopifyWebhookService } from './services/shopify-webhook.service';
import { ShopifyBillingController } from './controllers/shopify-billing.controller';
import { ShopifyWebhookController } from './controllers/shopify-webhook.controller';
import { ShopifyOAuthController } from './controllers/shopify-oauth.controller';
import { ShopifyBillingCallbackController } from './controllers/shopify-billing-callback.controller';
import { OrganizationModule } from '../organization/organization.module';
import { AuthModule } from '../auth/auth.module';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    forwardRef(() => OrganizationModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PlanModule),
  ],
  controllers: [
    ShopifyBillingController,
    ShopifyWebhookController,
    ShopifyOAuthController,
    ShopifyBillingCallbackController,
  ],
  providers: [
    ShopifyBillingService,
    ShopifyWebhookService,
  ],
  exports: [
    ShopifyBillingService,
    ShopifyWebhookService,
  ],
})
export class ShopifyBillingModule {}