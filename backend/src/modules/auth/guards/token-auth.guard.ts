import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../services/token.service';
import { JwtService } from '@nestjs/jwt';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class TokenAuthGuard implements CanActivate {
  private readonly logger = new Logger(TokenAuthGuard.name);
  private jwtService: JwtService | null = null;
  
  constructor(
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector,
    @Optional() jwtService: JwtService,
    private readonly moduleRef: ModuleRef,
  ) {
    this.jwtService = jwtService;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);
    
    this.logger.debug(`TokenAuthGuard: Processing request with token: ${token ? token.substring(0, 8) + '...' : 'none'}`);

    if (!token) {
      this.logger.warn('TokenAuthGuard: Access token is required but none provided');
      throw new UnauthorizedException('Access token is required');
    }

    // First, try to validate as JWT token (for Shopify auth)
    if (this.isJwtToken(token)) {
      // Lazy load JwtService if not available
      if (!this.jwtService) {
        try {
          this.jwtService = this.moduleRef.get(JwtService, { strict: false });
        } catch (error) {
          this.logger.debug('JwtService not available, skipping JWT validation');
        }
      }

      if (this.jwtService) {
        try {
          this.logger.debug(`TokenAuthGuard: Attempting to verify JWT token`);
          const payload = this.jwtService.verify(token);
          if (payload && payload.sub) {
            this.logger.debug(`TokenAuthGuard: Valid JWT token for user ${payload.sub}`);
            this.logger.debug(`TokenAuthGuard: JWT payload: ${JSON.stringify(payload)}`);
            request.userId = payload.sub;
            request.token = token;
            request.user = {
              id: payload.sub,
              userId: payload.sub,
              email: payload.email,
              organizationId: payload.organizationId,
              authType: payload.authType,
              shopifyShopDomain: payload.shopifyShopDomain,
            };
            return true;
          }
        } catch (error) {
          this.logger.debug(`TokenAuthGuard: JWT validation failed: ${error.message}`);
          this.logger.debug(`TokenAuthGuard: Error stack: ${error.stack}`);
          // Fall through to magic link validation
        }
      } else {
        this.logger.warn(`TokenAuthGuard: JwtService not available for JWT token validation`);
      }
    }

    // If not a valid JWT, validate as magic link token
    const validation = await this.tokenService.validateAccessToken(token);
    
    if (!validation.valid) {
      this.logger.warn(`TokenAuthGuard: Invalid or expired token: ${token.substring(0, 8)}...`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!validation.userId) {
      this.logger.warn(`TokenAuthGuard: Token validated but no userId found`);
      throw new UnauthorizedException('Invalid token: missing user information');
    }
    
    // Add the userId to the request for later use
    request.userId = validation.userId;
    // Store the token in the request for later use if needed
    request.token = token;
    
    this.logger.debug(`TokenAuthGuard: Successfully authenticated user ${validation.userId} with magic link token`);
    return true;
  }

  private extractTokenFromRequest(request: any): string | undefined {
    // Try to extract from query param
    const tokenFromQuery = request.query.token;
    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    // Try to extract from authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    return undefined;
  }

  private isJwtToken(token: string): boolean {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    return parts.length === 3;
  }
}