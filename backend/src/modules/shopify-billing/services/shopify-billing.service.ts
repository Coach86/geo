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
    this.logger.log('Creating Axios instance:', {
      shop,
      apiVersion: this.apiVersion,
      tokenLength: accessToken.length,
      tokenPrefix: accessToken.substring(0, 20),
      baseURL: `https://${shop}/admin/api/${this.apiVersion}`,
    });
    
    return axios.create({
      baseURL: `https://${shop}/admin/api/${this.apiVersion}`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });
  }

  private async graphqlRequest(shop: string, accessToken: string, query: string, variables?: any): Promise<any> {
    try {
      const response = await axios.post(
        `https://${shop}/admin/api/${this.apiVersion}/graphql.json`,
        {
          query,
          variables,
        },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.errors) {
        throw new BadRequestException(
          `GraphQL errors: ${JSON.stringify(response.data.errors)}`,
        );
      }

      return response.data.data;
    } catch (error) {
      this.logger.error('GraphQL request failed:', error);
      throw error;
    }
  }

  async createRecurringCharge(
    shop: string,
    accessToken: string,
    input: CreateRecurringChargeInput,
  ): Promise<ShopifyRecurringCharge> {
    try {
      const client = this.createAxiosInstance(shop, accessToken);
      
      const payload = {
        recurring_application_charge: {
          name: input.name,
          price: input.price,
          return_url: input.returnUrl,
          trial_days: input.trialDays || 0,
          test: input.test || false,
          currency: input.currency || 'USD',
        },
      };
      
      this.logger.log('SHOPIFY API CALL - Creating recurring charge:', {
        url: '/recurring_application_charges.json',
        shop,
        payload: JSON.stringify(payload, null, 2),
        input: {
          name: input.name,
          nameType: typeof input.name,
          nameLength: input.name?.length,
          price: input.price,
          returnUrl: input.returnUrl,
          trialDays: input.trialDays,
          test: input.test,
          currency: input.currency,
        },
      });
      
      const response = await client.post('/recurring_application_charges.json', payload);

      this.logger.log(`Created recurring charge for shop ${shop}`);
      this.logger.log('SHOPIFY API RESPONSE:', {
        chargeId: response.data.recurring_application_charge.id,
        chargeName: response.data.recurring_application_charge.name,
        confirmationUrl: response.data.recurring_application_charge.confirmation_url,
      });
      return response.data.recurring_application_charge;
    } catch (error) {
      this.logger.error(`Failed to create recurring charge: ${error.message}`, error.stack);
      
      // Log more details about the error
      if (error.response) {
        this.logger.error('Shopify API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      }
      
      // If it's a 401, provide more helpful error message
      if (error.response?.status === 401) {
        throw new BadRequestException(
          'Shopify access token is invalid or expired. Please reconnect your Shopify store.'
        );
      }
      
      throw new BadRequestException('Failed to create recurring charge');
    }
  }

  async createAppSubscription(
    shop: string,
    accessToken: string,
    input: {
      name: string;
      price: number;
      interval: 'ANNUAL' | 'EVERY_30_DAYS';
      trialDays?: number;
      test?: boolean;
      returnUrl: string;
      currencyCode?: string;
    },
  ): Promise<any> {
    const mutation = `
      mutation appSubscriptionCreate($input: AppSubscriptionInput!) {
        appSubscriptionCreate(input: $input) {
          appSubscription {
            id
            name
            status
            trialDays
            currentPeriodEnd
            test
            lineItems {
              id
              plan {
                pricingDetails {
                  __typename
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                    interval
                  }
                }
              }
            }
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
      input: {
        name: input.name,
        returnUrl: input.returnUrl,
        trialDays: input.trialDays || 0,
        test: input.test || false,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: {
                  amount: input.price,
                  currencyCode: input.currencyCode || 'USD',
                },
                interval: input.interval,
              },
            },
          },
        ],
      },
    };

    try {
      const result = await this.graphqlRequest(shop, accessToken, mutation, variables);
      
      if (result.appSubscriptionCreate.userErrors?.length > 0) {
        throw new BadRequestException(
          `Failed to create subscription: ${result.appSubscriptionCreate.userErrors.map((e: any) => e.message).join(', ')}`,
        );
      }

      return {
        subscription: result.appSubscriptionCreate.appSubscription,
        confirmationUrl: result.appSubscriptionCreate.confirmationUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to create app subscription: ${error.message}`, error.stack);
      throw error;
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
      // Shopify now uses API Secret as the webhook secret
      const webhookSecret = this.configService.get<string>('SHOPIFY_API_SECRET');
      if (!webhookSecret) {
        this.logger.warn('Shopify API secret not configured');
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

  // Subscription Product Management Methods (Admin Only)
  
  async createSubscriptionProduct(
    shop: string,
    accessToken: string,
    productData: any,
  ): Promise<any> {
    try {
      // Note: Shopify doesn't have a specific API for subscription products
      // You would typically store these in your own database
      // and use them as templates when creating recurring charges
      this.logger.log(`Creating subscription product: ${productData.name}`);
      
      // For now, we'll return a mock response
      // In a real implementation, save this to your database
      return {
        id: `product_${Date.now()}`,
        ...productData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to create subscription product: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create subscription product');
    }
  }

  async listSubscriptionProducts(
    shop: string,
    accessToken: string,
  ): Promise<any[]> {
    try {
      // In a real implementation, fetch from your database
      this.logger.log('Listing subscription products');
      
      // Return mock data for now
      return [
        {
          id: 'product_1',
          name: 'Basic Plan',
          price: 9.99,
          interval: 'monthly',
          currency: 'USD',
          trialDays: 7,
          features: ['10 projects', 'Basic support'],
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'product_2',
          name: 'Pro Plan',
          price: 19.99,
          interval: 'monthly',
          currency: 'USD',
          trialDays: 14,
          features: ['Unlimited projects', 'Premium support', 'API access'],
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    } catch (error) {
      this.logger.error(`Failed to list subscription products: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to list subscription products');
    }
  }

  async getSubscriptionProduct(
    shop: string,
    accessToken: string,
    productId: string,
  ): Promise<any> {
    try {
      // In a real implementation, fetch from your database
      this.logger.log(`Getting subscription product: ${productId}`);
      
      const products = await this.listSubscriptionProducts(shop, accessToken);
      const product = products.find(p => p.id === productId);
      
      if (!product) {
        throw new NotFoundException('Subscription product not found');
      }
      
      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get subscription product: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get subscription product');
    }
  }

  async updateSubscriptionProduct(
    shop: string,
    accessToken: string,
    productId: string,
    updateData: any,
  ): Promise<any> {
    try {
      // In a real implementation, update in your database
      this.logger.log(`Updating subscription product: ${productId}`);
      
      const product = await this.getSubscriptionProduct(shop, accessToken, productId);
      
      return {
        ...product,
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to update subscription product: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update subscription product');
    }
  }

  async deleteSubscriptionProduct(
    shop: string,
    accessToken: string,
    productId: string,
  ): Promise<void> {
    try {
      // In a real implementation, delete from your database
      this.logger.log(`Deleting subscription product: ${productId}`);
      
      await this.getSubscriptionProduct(shop, accessToken, productId);
      
      // Delete logic here
    } catch (error) {
      this.logger.error(`Failed to delete subscription product: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to delete subscription product');
    }
  }

  async activateSubscriptionProduct(
    shop: string,
    accessToken: string,
    productId: string,
  ): Promise<any> {
    try {
      // In a real implementation, update status in your database
      this.logger.log(`Activating subscription product: ${productId}`);
      
      const product = await this.getSubscriptionProduct(shop, accessToken, productId);
      
      return {
        ...product,
        active: true,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to activate subscription product: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to activate subscription product');
    }
  }

  async deactivateSubscriptionProduct(
    shop: string,
    accessToken: string,
    productId: string,
  ): Promise<any> {
    try {
      // In a real implementation, update status in your database
      this.logger.log(`Deactivating subscription product: ${productId}`);
      
      const product = await this.getSubscriptionProduct(shop, accessToken, productId);
      
      return {
        ...product,
        active: false,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate subscription product: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to deactivate subscription product');
    }
  }
}