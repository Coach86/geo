import { Injectable, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_TOKEN_ROUTE_KEY } from '../decorators/token-route.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public-route.decorator';
import { Observable } from 'rxjs';
import { ModuleRef } from '@nestjs/core';
import { TokenAuthGuard } from './token-auth.guard';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private tokenAuthGuard: TokenAuthGuard;

  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the request object
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    // Allow static files to bypass authentication
    if (path && (path.startsWith('/static/') || path.startsWith('/index.html') || path === '/')) {
      return true;
    }

    // Check if the route is marked as public (no auth required)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the route is public, allow access without authentication
    if (isPublic) {
      return true;
    }

    // Check if the route is marked as token-authenticated
    const isTokenRoute = this.reflector.getAllAndOverride<boolean>(IS_TOKEN_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the route should use token authentication, use TokenAuthGuard
    if (isTokenRoute) {
      // Lazy-load the TokenAuthGuard to avoid circular dependency
      if (!this.tokenAuthGuard) {
        this.tokenAuthGuard = this.moduleRef.get(TokenAuthGuard, { strict: false });
      }
      return this.tokenAuthGuard.canActivate(context);
    }

    // Otherwise, use the JWT AuthGuard
    try {
      return await super.canActivate(context) as boolean;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException('Unauthorized access - JWT authentication required');
      }
      throw error;
    }
  }
}