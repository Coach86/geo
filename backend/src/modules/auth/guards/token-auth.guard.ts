import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../services/token.service';

@Injectable()
export class TokenAuthGuard implements CanActivate {
  private readonly logger = new Logger(TokenAuthGuard.name);
  
  constructor(
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);
    
    this.logger.debug(`TokenAuthGuard: Processing request with token: ${token ? token.substring(0, 8) + '...' : 'none'}`);

    if (!token) {
      this.logger.warn('TokenAuthGuard: Access token is required but none provided');
      throw new UnauthorizedException('Access token is required');
    }

    // Validate the token
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
    
    this.logger.debug(`TokenAuthGuard: Successfully authenticated user ${validation.userId} with token`);
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
}