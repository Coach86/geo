import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export interface ShopifySession {
  shop: string;
  accessToken: string;
  scope?: string;
  host?: string;
}

declare global {
  namespace Express {
    interface Request {
      shopifySession?: ShopifySession;
    }
  }
}

@Injectable()
export class ShopifyAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Check for Shopify session in request
    // This could come from various sources:
    // 1. Session middleware
    // 2. JWT token with Shopify data
    // 3. Custom headers
    
    const shopDomain = request.headers['x-shopify-shop-domain'] as string;
    const accessToken = request.headers['x-shopify-access-token'] as string;
    
    // Alternative: Check session
    const session = (request as any).session?.shopify;
    
    if (shopDomain && accessToken) {
      // Set Shopify session on request
      request.shopifySession = {
        shop: shopDomain,
        accessToken: accessToken,
      };
      return true;
    } else if (session?.shop && session?.accessToken) {
      request.shopifySession = session;
      return true;
    }
    
    throw new UnauthorizedException('Shopify authentication required');
  }
}