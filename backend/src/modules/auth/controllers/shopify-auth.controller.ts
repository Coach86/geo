import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request,
  UnauthorizedException,
  BadRequestException,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ShopifyAuthService } from '../services/shopify-auth.service';
import { PublicRoute } from '../decorators/public-route.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

interface ShopifySessionRequest {
  sessionToken: string;
}

interface ShopifyAuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    shopifyShopDomain: string;
    organizationId: string;
  };
}

@ApiTags('shopify-auth')
@Controller('auth/shopify')
@UseGuards(ThrottlerGuard)
export class ShopifyAuthController {
  constructor(private readonly shopifyAuthService: ShopifyAuthService) {}

  @PublicRoute()
  @Post('session')
  @ApiOperation({ summary: 'Authenticate with Shopify session token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionToken: { 
          type: 'string', 
          description: 'Shopify session token',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
      },
      required: ['sessionToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            shopifyShopDomain: { type: 'string' },
            organizationId: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid session token' })
  async authenticateSession(
    @Body() body: ShopifySessionRequest
  ): Promise<ShopifyAuthResponse> {
    if (!body.sessionToken) {
      throw new UnauthorizedException('Session token is required');
    }

    return await this.shopifyAuthService.authenticateShopifyUser(body.sessionToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT token for Shopify user' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refreshToken(@CurrentUser() user: { userId: string; email: string; organizationId: string }) {
    if (!user.userId) {
      throw new UnauthorizedException('Invalid user');
    }

    return await this.shopifyAuthService.refreshShopifyToken(user.userId);
  }

  @PublicRoute()
  @Post('webhook')
  @ApiOperation({ summary: 'Handle Shopify webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Headers('x-shopify-hmac-sha256') signature: string,
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString() || '';
    
    if (!this.shopifyAuthService.validateWebhook(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Parse the webhook body
    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (error) {
      throw new BadRequestException('Invalid webhook body');
    }

    // Handle different webhook topics
    switch (topic) {
      case 'app/uninstalled':
        // Handle app uninstall - clean up or mark organization as inactive
        await this.shopifyAuthService.handleAppUninstalled(shopDomain, webhookData);
        break;
      
      case 'shop/update':
        // Handle shop updates - update organization details if needed
        await this.shopifyAuthService.handleShopUpdate(shopDomain, webhookData);
        break;
      
      case 'customers/data_request':
        // GDPR webhook - handle customer data request
        await this.shopifyAuthService.handleCustomerDataRequest(shopDomain, webhookData);
        break;
      
      case 'customers/redact':
        // GDPR webhook - handle customer data deletion
        await this.shopifyAuthService.handleCustomerRedact(shopDomain, webhookData);
        break;
      
      case 'shop/redact':
        // GDPR webhook - handle shop data deletion
        await this.shopifyAuthService.handleShopRedact(shopDomain, webhookData);
        break;
      
      default:
        // Log unhandled webhook topics for future implementation
        console.log(`Unhandled webhook topic: ${topic} for shop: ${shopDomain}`);
    }
    
    return { received: true };
  }
}