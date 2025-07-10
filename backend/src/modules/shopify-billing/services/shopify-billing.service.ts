import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ShopifyRecurringCharge,
  ShopifyUsageCharge,
  CreateRecurringChargeInput,
  ShopifyBillingPlan,
  ShopifyAppSubscription,
} from '../types/shopify-billing.types';

@Injectable()
export class ShopifyBillingService {
  private readonly logger = new Logger(ShopifyBillingService.name);
  private readonly apiVersion = '2024-01';

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private createAxiosInstance(shop: string, accessToken: string): AxiosInstance {
    return axios.create({
      baseURL: `https://${shop}/admin/api/${this.apiVersion}`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });
  }

  async createRecurringCharge(
    shop: string,
    accessToken: string,
    input: CreateRecurringChargeInput,
  ): Promise<ShopifyRecurringCharge> {
    try {
      const client = this.createAxiosInstance(shop, accessToken);
      const response = await client.post('/recurring_application_charges.json', {
        recurring_application_charge: {
          name: input.name,
          price: input.price,
          return_url: input.returnUrl,
          trial_days: input.trialDays || 0,
          test: input.test || false,
          currency: input.currency || 'USD',
        },
      });

      this.logger.log(`Created recurring charge for shop ${shop}`);
      return response.data.recurring_application_charge;
    } catch (error) {
      this.logger.error(`Failed to create recurring charge: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create recurring charge');
    }
  }

  async getRecurringCharge(
    shop: string,
    accessToken: string,
    chargeId: number,
  ): Promise<ShopifyRecurringCharge> {
    try {
      const client = this.createAxiosInstance(shop, accessToken);
      const response = await client.get(`/recurring_application_charges/${chargeId}.json`);
      return response.data.recurring_application_charge;
    } catch (error) {
      this.logger.error(`Failed to get recurring charge: ${error.message}`, error.stack);
      throw new NotFoundException('Recurring charge not found');
    }
  }

  async activateRecurringCharge(
    shop: string,
    accessToken: string,
    chargeId: number,
  ): Promise<ShopifyRecurringCharge> {
    try {
      const client = this.createAxiosInstance(shop, accessToken);
      
      // First, get the charge to check its status
      const charge = await this.getRecurringCharge(shop, accessToken, chargeId);
      
      if (charge.status !== 'accepted') {
        throw new BadRequestException(`Charge must be accepted by merchant first. Current status: ${charge.status}`);
      }

      // Activate the charge
      const response = await client.post(`/recurring_application_charges/${chargeId}/activate.json`);
      
      this.logger.log(`Activated recurring charge ${chargeId} for shop ${shop}`);
      
      // Emit event for successful activation
      this.eventEmitter.emit('shopify.billing.activated', {
        shop,
        chargeId,
        charge: response.data.recurring_application_charge,
      });

      return response.data.recurring_application_charge;
    } catch (error) {
      this.logger.error(`Failed to activate recurring charge: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cancelRecurringCharge(
    shop: string,
    accessToken: string,
    chargeId: number,
  ): Promise<void> {
    try {
      const client = this.createAxiosInstance(shop, accessToken);
      await client.delete(`/recurring_application_charges/${chargeId}.json`);
      
      this.logger.log(`Cancelled recurring charge ${chargeId} for shop ${shop}`);
      
      // Emit event for cancellation
      this.eventEmitter.emit('shopify.billing.cancelled', {
        shop,
        chargeId,
      });
    } catch (error) {
      this.logger.error(`Failed to cancel recurring charge: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to cancel recurring charge');
    }
  }

  async listRecurringCharges(
    shop: string,
    accessToken: string,
    status?: string,
  ): Promise<ShopifyRecurringCharge[]> {
    try {
      const client = this.createAxiosInstance(shop, accessToken);
      const params = status ? { status } : {};
      const response = await client.get('/recurring_application_charges.json', { params });
      return response.data.recurring_application_charges;
    } catch (error) {
      this.logger.error(`Failed to list recurring charges: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to list recurring charges');
    }
  }

  async createUsageCharge(
    shop: string,
    accessToken: string,
    recurringChargeId: number,
    description: string,
    price: number,
  ): Promise<ShopifyUsageCharge> {
    try {
      const client = this.createAxiosInstance(shop, accessToken);
      const response = await client.post(
        `/recurring_application_charges/${recurringChargeId}/usage_charges.json`,
        {
          usage_charge: {
            description,
            price,
          },
        },
      );

      this.logger.log(`Created usage charge for shop ${shop}`);
      return response.data.usage_charge;
    } catch (error) {
      this.logger.error(`Failed to create usage charge: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create usage charge');
    }
  }

  async getUsageCharges(
    shop: string,
    accessToken: string,
    recurringChargeId: number,
  ): Promise<ShopifyUsageCharge[]> {
    try {
      const client = this.createAxiosInstance(shop, accessToken);
      const response = await client.get(
        `/recurring_application_charges/${recurringChargeId}/usage_charges.json`,
      );
      return response.data.usage_charges;
    } catch (error) {
      this.logger.error(`Failed to get usage charges: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get usage charges');
    }
  }

  async verifyWebhookSignature(
    rawBody: string,
    signature: string,
  ): Promise<boolean> {
    try {
      const webhookSecret = this.configService.get<string>('SHOPIFY_WEBHOOK_SECRET');
      if (!webhookSecret) {
        this.logger.warn('Shopify webhook secret not configured');
        return false;
      }

      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody, 'utf8')
        .digest('base64');

      return hash === signature;
    } catch (error) {
      this.logger.error(`Failed to verify webhook signature: ${error.message}`, error.stack);
      return false;
    }
  }

  // GraphQL-based methods for newer Shopify API
  async createSubscriptionWithGraphQL(
    shop: string,
    accessToken: string,
    plan: ShopifyBillingPlan,
  ): Promise<ShopifyAppSubscription> {
    try {
      const client = this.createAxiosInstance(shop, accessToken);
      
      const mutation = `
        mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean!, $lineItems: [AppSubscriptionLineItemInput!]!) {
          appSubscriptionCreate(
            name: $name,
            returnUrl: $returnUrl,
            test: $test,
            lineItems: $lineItems
          ) {
            appSubscription {
              id
              name
              status
              test
              trialDays
              currentPeriodEnd
              createdAt
            }
            confirmationUrl
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        name: plan.name,
        returnUrl: `${this.configService.get('APP_URL')}/billing/callback`,
        test: plan.test || false,
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: plan.price,
                currencyCode: plan.currency || 'USD',
              },
              interval: plan.interval === 'monthly' ? 'EVERY_30_DAYS' : 'ANNUAL',
            },
          },
        }],
      };

      const response = await client.post('/graphql.json', {
        query: mutation,
        variables,
      });

      if (response.data.data.appSubscriptionCreate.userErrors.length > 0) {
        const errors = response.data.data.appSubscriptionCreate.userErrors;
        throw new BadRequestException(`GraphQL errors: ${JSON.stringify(errors)}`);
      }

      return response.data.data.appSubscriptionCreate.appSubscription;
    } catch (error) {
      this.logger.error(`Failed to create subscription with GraphQL: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getActiveSubscription(
    shop: string,
    accessToken: string,
  ): Promise<ShopifyRecurringCharge | null> {
    try {
      const charges = await this.listRecurringCharges(shop, accessToken, 'active');
      return charges.length > 0 ? charges[0] : null;
    } catch (error) {
      this.logger.error(`Failed to get active subscription: ${error.message}`, error.stack);
      return null;
    }
  }

  generateBillingUrl(charge: ShopifyRecurringCharge): string {
    return charge.confirmation_url || charge.decorated_return_url || '';
  }
}