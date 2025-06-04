import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class JwtTokenService {
  private readonly logger = new Logger(JwtTokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  /**
   * Generate a JWT token for a user with organization information
   */
  async generateUserToken(userId: string): Promise<string> {
    try {
      // Get user with organization information
      const user = await this.userService.findOne(userId);
      
      const payload = {
        sub: userId,
        email: user.email,
        organizationId: user.organizationId,
      };

      const token = this.jwtService.sign(payload);
      this.logger.log(`Generated JWT token for user ${userId} in organization ${user.organizationId}`);
      
      return token;
    } catch (error) {
      this.logger.error(`Failed to generate JWT token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate a JWT token for an admin
   */
  async generateAdminToken(adminId: string, email: string): Promise<string> {
    const payload = {
      sub: adminId,
      email: email,
      isAdmin: true,
    };

    return this.jwtService.sign(payload);
  }
}