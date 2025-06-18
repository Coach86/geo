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

      // In production, verify the token signature using Shopify's public key
      // For now, we'll do basic validation
      const shopifyApiSecret = this.configService.get<string>('SHOPIFY_API_SECRET');
      const isDevelopment = this.configService.get<string>('NODE_ENV') !== 'production';
      
      // Allow test tokens in development
      if (isDevelopment && payload.iss?.includes('test-shop')) {
        this.logger.warn('Accepting test token in development mode');
        return payload;
      }
      
      if (!shopifyApiSecret) {
        throw new Error('SHOPIFY_API_SECRET not configured');
      }

      // TODO: Implement proper JWT verification with Shopify's public key
      // This is a simplified version - in production, use proper JWT verification
      
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
    // For test shops, return a more readable email
    if (shopDomain.includes('test-shop') || shopDomain.includes('demo-shop')) {
      return `test-user-${userId}@${shopDomain}`;
    }
    
    // TODO: Implement actual Shopify API call to get user details
    // For now, return a placeholder email
    return `${userId}@${shopDomain}`;
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
    const shopifyWebhookSecret = this.configService.get<string>('SHOPIFY_WEBHOOK_SECRET');
    if (!shopifyWebhookSecret) {
      this.logger.warn('SHOPIFY_WEBHOOK_SECRET not configured');
      return false;
    }

    const hash = crypto
      .createHmac('sha256', shopifyWebhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    return hash === signature;
  }
}