import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    
    // Check if user is an admin (has isAdmin flag)
    if (!user.isAdmin) {
      throw new UnauthorizedException('Admin access required');
    }
    
    // Ensure this is not a Shopify user
    if (user.authType === 'shopify') {
      throw new UnauthorizedException('Admin access is not available for Shopify users');
    }
    
    return true;
  }
}