import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PublicRoute } from '../../auth/decorators/public-route.decorator';
import { OrganizationService } from '../../organization/services/organization.service';
import axios from 'axios';
import * as crypto from 'crypto';

@ApiTags('shopify-oauth')
@Controller('shopify/oauth')
export class ShopifyOAuthController {
  private readonly logger = new Logger(ShopifyOAuthController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly organizationService: OrganizationService,
  ) {}

  @Get('install')
  @PublicRoute()
  @ApiOperation({ summary: 'Start Shopify OAuth installation flow' })
  @ApiQuery({ name: 'shop', required: true, description: 'Shop domain (e.g., my-store.myshopify.com)' })
  async startInstall(
    @Query('shop') shop: string,
    @Res() res: Response,
  ) {
    if (!shop) {
      throw new BadRequestException('Shop parameter is required');
    }

    // Ensure shop domain is in correct format
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    
    const apiKey = this.configService.get<string>('SHOPIFY_API_KEY');
    const scopes = 'read_products,write_products,read_orders,write_orders';
    const redirectUri = `${this.configService.get<string>('APP_URL')}/api/shopify/oauth/callback`;
    // Since we don't have user context, we'll create/find organization based on shop domain in callback
    const state = crypto.randomBytes(16).toString('hex');

    // In production, you'd store this state in Redis or similar for verification

    const installUrl = `https://${shopDomain}/admin/oauth/authorize?` +
      `client_id=${apiKey}&` +
      `scope=${scopes}&` +
      `state=${state}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;

    this.logger.log(`Redirecting to Shopify OAuth: ${installUrl}`);
    return res.redirect(installUrl);
  }

  @Get('callback')
  @PublicRoute()
  @ApiOperation({ summary: 'Handle Shopify OAuth callback' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'shop', required: true })
  @ApiQuery({ name: 'state', required: true })
  async handleCallback(
    @Query('code') code: string,
    @Query('shop') shop: string,
    @Query('state') state: string,
    @Query('hmac') hmac: string,
    @Query() query: any,
    @Res() res: Response,
  ) {
    this.logger.log('OAuth callback received:', {
      shop,
      code: code ? 'present' : 'missing',
      state,
      hmac: hmac ? 'present' : 'missing',
      queryParams: Object.keys(query),
    });

    try {
      // Verify HMAC
      const queryString = Object.keys(query)
        .filter(key => key !== 'hmac' && key !== 'signature')
        .sort()
        .map(key => `${key}=${query[key]}`)
        .join('&');

      const apiSecret = this.configService.get<string>('SHOPIFY_API_SECRET');
      if (!apiSecret) {
        throw new BadRequestException('SHOPIFY_API_SECRET not configured');
      }

      const hash = crypto
        .createHmac('sha256', apiSecret)
        .update(queryString)
        .digest('hex');

      if (hash !== hmac) {
        throw new BadRequestException('HMAC validation failed');
      }

      // Find or create organization based on shop domain
      let organization = await this.organizationService.findByShopDomain(shop);
      
      if (!organization || organization.length === 0) {
        // Create new organization for this shop
        const newOrg = await this.organizationService.create({
          name: shop,
          shopifyShopDomain: shop,
        });
        organization = [newOrg];
      }
      
      const organizationId = organization[0].id;

      // Exchange code for access token
      const accessTokenResponse = await axios.post(
        `https://${shop}/admin/oauth/access_token`,
        {
          client_id: this.configService.get<string>('SHOPIFY_API_KEY'),
          client_secret: this.configService.get<string>('SHOPIFY_API_SECRET'),
          code,
        },
      );

      const { access_token } = accessTokenResponse.data;

      // Get shop data
      const shopDataResponse = await axios.get(
        `https://${shop}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': access_token,
          },
        },
      );

      // Update organization with Shopify credentials
      this.logger.log(`Updating organization ${organizationId} with Shopify credentials`, {
        shop,
        tokenPrefix: access_token.substring(0, 20),
        shopData: shopDataResponse.data.shop.name,
      });

      const updatedOrg = await this.organizationService.update(organizationId, {
        shopifyShopDomain: shop,
        shopifyAccessToken: access_token,
        shopifyShopData: shopDataResponse.data.shop,
      });

      if (!updatedOrg) {
        throw new Error('Failed to update organization');
      }

      this.logger.log(`Shopify OAuth completed for organization ${organizationId}, shop ${shop}`);

      // Redirect to success page
      return res.redirect(`${this.configService.get<string>('FRONTEND_URL')}/admin/shopify/success`);
    } catch (error) {
      this.logger.error(`Shopify OAuth error: ${error.message}`, error.stack);
      return res.redirect(`${this.configService.get<string>('FRONTEND_URL')}/admin/shopify/error`);
    }
  }

  @Post('uninstall')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Uninstall Shopify app from organization' })
  async uninstall(@CurrentUser() user: any) {
    await this.organizationService.update(user.organizationId, {
      shopifyShopDomain: undefined,
      shopifyAccessToken: undefined,
      shopifyShopData: undefined,
      shopifySubscriptionId: undefined,
      shopifySubscriptionData: undefined,
    });

    return { message: 'Shopify app uninstalled successfully' };
  }
}