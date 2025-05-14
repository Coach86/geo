import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const admin = request.user;
    
    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }
    
    return true;
  }
}