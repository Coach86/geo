import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrganizationService } from '../../organization/services/organization.service';
import { ShopifyBillingService } from './shopify-billing.service';
import { ShopifyWebhookPayload } from '../types/shopify-billing.types';

export enum ShopifyWebhookTopic {
  APP_SUBSCRIPTIONS_UPDATE = 'app_subscriptions/update',
  APP_SUBSCRIPTIONS_CANCEL = 'app_subscriptions/cancel',
  APP_SUBSCRIPTIONS_ACTIVATE = 'app_subscriptions/activate',
  APP_SUBSCRIPTIONS_DECLINE = 'app_subscriptions/decline',
  APP_PURCHASES_ONE_TIME_UPDATE = 'app_purchases_one_time/update',
  SHOP_UPDATE = 'shop/update',
  APP_UNINSTALLED = 'app/uninstalled',
}

@Injectable()
export class ShopifyWebhookService {
  private readonly logger = new Logger(ShopifyWebhookService.name);

  constructor(
    @Inject(forwardRef(() => OrganizationService))
    private readonly organizationService: OrganizationService,
    private readonly shopifyBillingService: ShopifyBillingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handleWebhook(
    topic: string,
    shop: string,
    payload: any,
    rawBody: string,
    signature: string,
  ): Promise<void> {
    // Verify webhook signature
    const isValid = await this.shopifyBillingService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.error(`Invalid webhook signature for shop ${shop}`);
      throw new Error('Invalid webhook signature');
    }

    this.logger.log(`Processing webhook ${topic} for shop ${shop}`);

    switch (topic) {
      case ShopifyWebhookTopic.APP_SUBSCRIPTIONS_UPDATE:
        await this.handleSubscriptionUpdate(shop, payload);
        break;
      case ShopifyWebhookTopic.APP_SUBSCRIPTIONS_CANCEL:
        await this.handleSubscriptionCancel(shop, payload);
        break;
      case ShopifyWebhookTopic.APP_SUBSCRIPTIONS_ACTIVATE:
        await this.handleSubscriptionActivate(shop, payload);
        break;
      case ShopifyWebhookTopic.APP_SUBSCRIPTIONS_DECLINE:
        await this.handleSubscriptionDecline(shop, payload);
        break;
      case ShopifyWebhookTopic.APP_UNINSTALLED:
        await this.handleAppUninstalled(shop, payload);
        break;
      case ShopifyWebhookTopic.SHOP_UPDATE:
        await this.handleShopUpdate(shop, payload);
        break;
      default:
        this.logger.warn(`Unhandled webhook topic: ${topic}`);
    }
  }

  private async handleSubscriptionUpdate(shop: string, payload: any): Promise<void> {
    try {
      const organization = await this.organizationService.findByShopifyDomain(shop);
      if (!organization) {
        this.logger.warn(`Organization not found for shop ${shop}`);
        return;
      }

      // Update subscription status
      await this.organizationService.update(organization.id, {
        shopifySubscriptionId: payload.app_subscription.admin_graphql_api_id,
        subscriptionStatus: this.mapShopifyStatusToInternal(payload.app_subscription.status),
        shopifySubscriptionData: payload.app_subscription,
      });

      // Emit event for subscription update
      this.eventEmitter.emit('shopify.subscription.updated', {
        organizationId: organization.id,
        shop,
        subscription: payload.app_subscription,
      });

      this.logger.log(`Updated subscription for organization ${organization.id}`);
    } catch (error) {
      this.logger.error(`Error handling subscription update: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleSubscriptionCancel(shop: string, payload: any): Promise<void> {
    try {
      const organization = await this.organizationService.findByShopifyDomain(shop);
      if (!organization) {
        this.logger.warn(`Organization not found for shop ${shop}`);
        return;
      }

      // Update organization to cancelled status
      await this.organizationService.update(organization.id, {
        subscriptionStatus: 'cancelled',
        shopifySubscriptionData: payload.app_subscription,
      });

      // Emit cancellation event
      this.eventEmitter.emit('shopify.subscription.cancelled', {
        organizationId: organization.id,
        shop,
        subscription: payload.app_subscription,
      });

      this.logger.log(`Cancelled subscription for organization ${organization.id}`);
    } catch (error) {
      this.logger.error(`Error handling subscription cancellation: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleSubscriptionActivate(shop: string, payload: any): Promise<void> {
    try {
      const organization = await this.organizationService.findByShopifyDomain(shop);
      if (!organization) {
        this.logger.warn(`Organization not found for shop ${shop}`);
        return;
      }

      // Update organization to active status
      await this.organizationService.update(organization.id, {
        subscriptionStatus: 'active',
        shopifySubscriptionId: payload.app_subscription.admin_graphql_api_id,
        shopifySubscriptionData: payload.app_subscription,
      });

      // Update plan settings based on subscription
      const planName = payload.app_subscription.name;
      await this.updatePlanSettingsFromSubscription(organization.id, planName);

      // Emit activation event
      this.eventEmitter.emit('shopify.subscription.activated', {
        organizationId: organization.id,
        shop,
        subscription: payload.app_subscription,
      });

      this.logger.log(`Activated subscription for organization ${organization.id}`);
    } catch (error) {
      this.logger.error(`Error handling subscription activation: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleSubscriptionDecline(shop: string, payload: any): Promise<void> {
    try {
      const organization = await this.organizationService.findByShopifyDomain(shop);
      if (!organization) {
        this.logger.warn(`Organization not found for shop ${shop}`);
        return;
      }

      // Update organization to declined status
      await this.organizationService.update(organization.id, {
        subscriptionStatus: 'declined',
        shopifySubscriptionData: payload.app_subscription,
      });

      // Emit decline event
      this.eventEmitter.emit('shopify.subscription.declined', {
        organizationId: organization.id,
        shop,
        subscription: payload.app_subscription,
      });

      this.logger.log(`Subscription declined for organization ${organization.id}`);
    } catch (error) {
      this.logger.error(`Error handling subscription decline: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleAppUninstalled(shop: string, payload: any): Promise<void> {
    try {
      const organization = await this.organizationService.findByShopifyDomain(shop);
      if (!organization) {
        this.logger.warn(`Organization not found for shop ${shop}`);
        return;
      }

      // Update organization to reflect app uninstallation
      await this.organizationService.update(organization.id, {
        subscriptionStatus: 'cancelled',
        shopifyAccessToken: undefined,
        shopifySubscriptionId: undefined,
        shopifySubscriptionData: undefined,
      });

      // Emit uninstall event
      this.eventEmitter.emit('shopify.app.uninstalled', {
        organizationId: organization.id,
        shop,
      });

      this.logger.log(`App uninstalled for organization ${organization.id}`);
    } catch (error) {
      this.logger.error(`Error handling app uninstall: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleShopUpdate(shop: string, payload: any): Promise<void> {
    try {
      const organization = await this.organizationService.findByShopifyDomain(shop);
      if (!organization) {
        this.logger.warn(`Organization not found for shop ${shop}`);
        return;
      }

      // Update shop data
      await this.organizationService.update(organization.id, {
        shopifyShopData: payload,
      });

      this.logger.log(`Updated shop data for organization ${organization.id}`);
    } catch (error) {
      this.logger.error(`Error handling shop update: ${error.message}`, error.stack);
      throw error;
    }
  }

  private mapShopifyStatusToInternal(shopifyStatus: string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'pending',
      ACTIVE: 'active',
      DECLINED: 'declined',
      EXPIRED: 'expired',
      FROZEN: 'paused',
      CANCELLED: 'cancelled',
    };

    return statusMap[shopifyStatus] || 'unknown';
  }

  private async updatePlanSettingsFromSubscription(
    organizationId: string,
    planName: string,
  ): Promise<void> {
    // Map subscription plan names to internal plan settings
    const planSettingsMap: Record<string, any> = {
      'Basic Plan': {
        maxProjects: 5,
        maxBatchesPerMonth: 10,
        maxModelsPerBatch: 3,
        features: ['basic_analytics', 'email_reports'],
      },
      'Professional Plan': {
        maxProjects: 20,
        maxBatchesPerMonth: 50,
        maxModelsPerBatch: 7,
        features: ['advanced_analytics', 'email_reports', 'api_access', 'priority_support'],
      },
      'Enterprise Plan': {
        maxProjects: -1, // Unlimited
        maxBatchesPerMonth: -1, // Unlimited
        maxModelsPerBatch: -1, // All available models
        features: ['advanced_analytics', 'email_reports', 'api_access', 'priority_support', 'custom_integrations', 'dedicated_support'],
      },
    };

    const settings = planSettingsMap[planName];
    if (settings) {
      await this.organizationService.updatePlanSettings(organizationId, settings);
    } else {
      this.logger.warn(`Unknown plan name: ${planName}`);
    }
  }
}