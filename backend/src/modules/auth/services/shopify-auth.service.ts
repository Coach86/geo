import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/services/user.service';
import { OrganizationService } from '../../organization/services/organization.service';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { CreateOrganizationDto } from '../../organization/dto/create-organization.dto';
import * as crypto from 'crypto';

interface ShopifySessionPayload {
  iss: string;
  dest: string;
  aud: string;
  sub: string;
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
  sid: string;
}

interface ShopifyAuthResult {
  access_token: string;
  user: {
    id: string;
    email: string;
    shopifyShopDomain: string;
    organizationId: string;
  };
}

interface ShopifyWebhookData {
  id?: string;
  name?: string;
  email?: string;
  customer?: {
    id: string;
  };
  orders_requested?: string[];
  orders_to_redact?: string[];
}

@Injectable()
export class ShopifyAuthService {
  private readonly logger = new Logger(ShopifyAuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticate a Shopify user using session token
   */
  async authenticateShopifyUser(sessionToken: string): Promise<ShopifyAuthResult> {
    this.logger.log(`Authenticating Shopify user with token: ${sessionToken.substring(0, 50)}...`);
    try {
      // Validate and decode Shopify session token
      const payload = await this.validateShopifySessionToken(sessionToken);
      
      const shopDomain = payload.dest.replace('https://', '');
      const shopifyUserId = payload.sub;
      
      // Extract email from sub field (format: user_id)
      // In production, you might need to make an API call to Shopify to get user details
      const email = await this.getShopifyUserEmail(shopifyUserId, shopDomain);
      
      // Find or create organization for this shop
      let organization;
      try {
        const orgs = await this.organizationService.findByShopDomain(shopDomain);
        if (orgs && orgs.length > 0) {
          organization = orgs[0];
          this.logger.log(`Found existing organization: ${organization.id} for shop: ${shopDomain}`);
        } else {
          throw new Error('No organization found');
        }
      } catch (error) {
        // Organization doesn't exist, create it
        this.logger.log(`Creating new organization for shop: ${shopDomain}`);
        const createOrgDto: CreateOrganizationDto = {
          name: shopDomain,
          shopifyShopDomain: shopDomain,
        };
        organization = await this.organizationService.create(createOrgDto);
        this.logger.log(`Created new organization: ${organization.id} for shop: ${shopDomain}`);
      }

      // Find or create user
      let user;
      
      if (!organization || !organization.id) {
        throw new Error('Failed to create or find organization');
      }
      
      try {
        // Try to find user by shopify shop domain and email
        user = await this.userService.findByShopifyShop(shopDomain, email);
        this.logger.log(`Found existing user: ${user.id} for shop: ${shopDomain}`);
      } catch (error) {
        // User doesn't exist, create new one
        this.logger.log(`User not found, creating new user for: ${email}`);
        const createUserDto: CreateUserDto = {
          email,
          organizationId: organization.id,
        };
        
        user = await this.userService.create(createUserDto);
        
        // Update user with Shopify-specific fields
        await this.userService.update(user.id, {
          shopifyShopDomain: shopDomain,
          shopifyShopId: shopifyUserId,
          authType: 'shopify',
        });
        
        this.logger.log(`Created new Shopify user: ${user.id} for shop: ${shopDomain}`);
      }

      // Generate JWT token for the user
      const jwtPayload = {
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        shopifyShopDomain: shopDomain,
        authType: 'shopify',
      };

      const accessToken = this.jwtService.sign(jwtPayload);

      return {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          shopifyShopDomain: shopDomain,
          organizationId: user.organizationId,
        },
      };
    } catch (error) {
      this.logger.error(`Shopify authentication error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid Shopify session token');
    }
  }

  /**
   * Validate Shopify session token
   */
  private async validateShopifySessionToken(token: string): Promise<ShopifySessionPayload> {
    this.logger.log('Validating Shopify session token...');
    try {
      // Decode the JWT without verification first to get the header
      const [headerB64, payloadB64, signatureB64] = token.split('.');
      
      if (!headerB64 || !payloadB64 || !signatureB64) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString()) as ShopifySessionPayload;
      
      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error('Token expired');
      }

      // Verify the token signature using HMAC SHA256
      const shopifyApiSecret = this.configService.get<string>('SHOPIFY_API_SECRET');
      const shopifyApiKey = this.configService.get<string>('SHOPIFY_API_KEY');
      
      if (!shopifyApiSecret) {
        throw new Error('SHOPIFY_API_SECRET not configured');
      }

      // Log the credentials being used (masked for security)
      this.logger.log('Using Shopify credentials for verification:', {
        apiKey: shopifyApiKey,
        apiSecretFirstChars: shopifyApiSecret.substring(0, 8) + '...',
        apiSecretLength: shopifyApiSecret.length,
        apiSecretLastChars: '...' + shopifyApiSecret.substring(shopifyApiSecret.length - 4),
      });

      // Verify JWT signature using HMAC SHA256
      const message = `${headerB64}.${payloadB64}`;
      const expectedSignature = crypto
        .createHmac('sha256', shopifyApiSecret)
        .update(message)
        .digest('base64url');
      
      if (signatureB64 !== expectedSignature) {
        this.logger.error('Signature verification failed', {
          expected: expectedSignature.substring(0, 20) + '...',
          received: signatureB64.substring(0, 20) + '...',
          apiKey: shopifyApiKey,
          secretLength: shopifyApiSecret.length,
          message: message.substring(0, 50) + '...',
          tokenPayload: payload,
        });
        throw new Error('Invalid token signature');
      }
      
      // Validate token claims
      if (!payload.dest || !payload.dest.includes('myshopify.com')) {
        throw new Error('Invalid destination claim');
      }
      
      if (!shopifyApiKey) {
        throw new Error('SHOPIFY_API_KEY not configured');
      }
      
      if (!payload.aud || payload.aud !== shopifyApiKey) {
        throw new Error('Invalid audience claim');
      }
      
      return payload;
    } catch (error) {
      this.logger.error(`Token validation error: ${error.message}`);
      throw new UnauthorizedException('Invalid session token');
    }
  }

  /**
   * Get Shopify user email
   * In production, this would make an API call to Shopify
   */
  private async getShopifyUserEmail(userId: string, shopDomain: string): Promise<string> {
    
    try {
      // Check if we have Shopify access token for this shop
      const shopifyAccessToken = this.configService.get<string>('SHOPIFY_ACCESS_TOKEN');
      const shopifyApiVersion = this.configService.get<string>('SHOPIFY_API_VERSION') || '2024-01';
      
      if (!shopifyAccessToken) {
        this.logger.warn('SHOPIFY_ACCESS_TOKEN not configured, using fallback email');
        return `${userId}@${shopDomain}`;
      }
      
      // Make API call to Shopify Admin API to get user details
      // Note: This requires the shop to have granted appropriate permissions
      const shopifyApiUrl = `https://${shopDomain}/admin/api/${shopifyApiVersion}/users/${userId}.json`;
      
      const response = await fetch(shopifyApiUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': shopifyAccessToken,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Shopify API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.user && data.user.email) {
        return data.user.email;
      }
      
      // If no email found, fall back to constructed email
      this.logger.warn(`No email found for Shopify user ${userId}, using fallback`);
      return `${userId}@${shopDomain}`;
      
    } catch (error) {
      this.logger.error(`Failed to fetch Shopify user details: ${error.message}`, error.stack);
      // Fall back to constructed email on error
      return `${userId}@${shopDomain}`;
    }
  }

  /**
   * Refresh JWT token for Shopify user
   */
  async refreshShopifyToken(userId: string): Promise<{ access_token: string }> {
    const user = await this.userService.findOne(userId);
    
    if (!user.shopifyShopDomain) {
      throw new UnauthorizedException('Not a Shopify user');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      shopifyShopDomain: user.shopifyShopDomain,
      authType: user.authType || 'shopify',
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Validate webhook from Shopify
   */
  validateWebhook(rawBody: string, signature: string): boolean {
    // Shopify now uses API Secret as the webhook secret
    const shopifyApiSecret = this.configService.get<string>('SHOPIFY_API_SECRET');
    if (!shopifyApiSecret) {
      this.logger.warn('SHOPIFY_API_SECRET not configured');
      return false;
    }

    const hash = crypto
      .createHmac('sha256', shopifyApiSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    return hash === signature;
  }

  /**
   * Handle app uninstalled webhook
   */
  async handleAppUninstalled(shopDomain: string, webhookData: ShopifyWebhookData): Promise<void> {
    this.logger.log(`Handling app uninstalled for shop: ${shopDomain}`);
    
    try {
      // Find the organization for this shop
      const organizations = await this.organizationService.findByShopDomain(shopDomain);
      
      if (organizations && organizations.length > 0) {
        const organization = organizations[0];
        
        // Log the app uninstall event
        // In a real implementation, you might want to:
        // 1. Cancel any active subscriptions
        // 2. Mark projects as inactive
        // 3. Send a notification email
        this.logger.log(`App uninstalled for organization ${organization.id} (shop: ${shopDomain})`);
        
        // Update the organization's subscription status if they have one
        if (organization.stripeSubscriptionId) {
          await this.organizationService.update(organization.id, {
            subscriptionStatus: 'cancelled',
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error handling app uninstalled webhook: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle shop update webhook
   */
  async handleShopUpdate(shopDomain: string, webhookData: ShopifyWebhookData): Promise<void> {
    this.logger.log(`Handling shop update for shop: ${shopDomain}`);
    
    try {
      // Find the organization for this shop
      const organizations = await this.organizationService.findByShopDomain(shopDomain);
      
      if (organizations && organizations.length > 0) {
        const organization = organizations[0];
        
        // Update organization with new shop data
        const updates: Record<string, any> = {};
        
        if (webhookData.name && webhookData.name !== organization.name) {
          updates.name = webhookData.name;
        }
        
        if (Object.keys(updates).length > 0) {
          await this.organizationService.update(organization.id, updates);
          this.logger.log(`Updated organization ${organization.id} with shop changes`);
        }
        
        // Log additional shop data for future reference
        if (webhookData.email) {
          this.logger.log(`Shop email updated for ${shopDomain}: ${webhookData.email}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error handling shop update webhook: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle customer data request webhook (GDPR)
   */
  async handleCustomerDataRequest(shopDomain: string, webhookData: ShopifyWebhookData): Promise<void> {
    this.logger.log(`Handling customer data request for shop: ${shopDomain}`);
    
    // In a real implementation, you would:
    // 1. Find all data related to the customer
    // 2. Generate a report
    // 3. Send it to the provided webhook URL
    
    // For now, just log the request
    this.logger.log(`Customer data requested for shop ${shopDomain}:`, {
      customerId: webhookData.customer?.id,
      ordersRequested: webhookData.orders_requested,
    });
  }

  /**
   * Handle customer redact webhook (GDPR)
   */
  async handleCustomerRedact(shopDomain: string, webhookData: ShopifyWebhookData): Promise<void> {
    this.logger.log(`Handling customer redact for shop: ${shopDomain}`);
    
    // In a real implementation, you would:
    // 1. Find all data related to the customer
    // 2. Delete or anonymize it
    
    // For now, just log the request
    this.logger.log(`Customer data deletion requested for shop ${shopDomain}:`, {
      customerId: webhookData.customer?.id,
      ordersToRedact: webhookData.orders_to_redact,
    });
  }

  /**
   * Handle shop redact webhook (GDPR)
   */
  async handleShopRedact(shopDomain: string, webhookData: ShopifyWebhookData): Promise<void> {
    this.logger.log(`Handling shop redact for shop: ${shopDomain}`);
    
    try {
      // Find the organization for this shop
      const organizations = await this.organizationService.findByShopDomain(shopDomain);
      
      if (organizations && organizations.length > 0) {
        const organization = organizations[0];
        
        // In a real implementation, you would delete all data
        // For GDPR compliance, we should:
        // 1. Delete all user data
        // 2. Delete all project data
        // 3. Delete the organization
        
        // For now, log the request for manual processing
        this.logger.warn(`SHOP REDACT REQUEST: Organization ${organization.id} (shop: ${shopDomain}) needs to be deleted for GDPR compliance`);
        
        // Cancel any active subscriptions
        if (organization.stripeSubscriptionId) {
          await this.organizationService.update(organization.id, {
            subscriptionStatus: 'cancelled',
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error handling shop redact webhook: ${error.message}`, error.stack);
    }
  }
}