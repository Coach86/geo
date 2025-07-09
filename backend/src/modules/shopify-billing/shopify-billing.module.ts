import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ShopifyBillingService } from './services/shopify-billing.service';
import { ShopifyWebhookService } from './services/shopify-webhook.service';
import { ShopifyBillingController } from './controllers/shopify-billing.controller';
import { ShopifyWebhookController } from './controllers/shopify-webhook.controller';
import { OrganizationModule } from '../organization/organization.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    forwardRef(() => OrganizationModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [
    ShopifyBillingController,
    ShopifyWebhookController,
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