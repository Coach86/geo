import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default_secret_key_for_dev',
    });
  }

  async validate(payload: any) {
    // Handle both admin JWT and Shopify JWT tokens
    return { 
      userId: payload.sub, 
      email: payload.email,
      organizationId: payload.organizationId,
      isAdmin: payload.isAdmin,
      authType: payload.authType, // 'shopify' or undefined
      shopifyShopDomain: payload.shopifyShopDomain,
      // For compatibility with existing code that expects 'id'
      id: payload.sub
    };
  }
}