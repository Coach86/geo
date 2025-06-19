import { Injectable, Logger, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';
import { AccessToken, AccessTokenDocument } from '../schemas/access-token.schema';
import { AccessTokenRepository } from '../repositories/access-token.repository';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly accessTokenRepository: AccessTokenRepository,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  /**
   * Generate a secure access token for a user
   */
  async generateAccessToken(userId: string, metadata?: any): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiryHours = this.configService.get<number>('REPORT_TOKEN_EXPIRY_HOURS') || 24;
    const expiresAt = addDays(new Date(), expiryHours / 24); // Convert hours to days

    await this.accessTokenRepository.create({
      token,
      userId,
      expiresAt,
      metadata,
    });
    this.logger.log(`Generated new access token for user ${userId} with metadata: ${JSON.stringify(metadata)}`);
    return token;
  }

  /**
   * Validate an access token
   */
  async validateAccessToken(token: string): Promise<{ valid: boolean; userId?: string; metadata?: any }> {
    const accessToken = await this.accessTokenRepository.findByToken(token);

    if (!accessToken) {
      this.logger.warn(`Access token not found: ${token.substring(0, 8)}...`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    const now = new Date();
    if (accessToken.expiresAt < now) {
      this.logger.warn(
        `Access token expired: ${token.substring(0, 8)}... (expired at ${accessToken.expiresAt})`,
      );
      return {
        valid: false,
        userId: accessToken.userId,
      };
    }

    // Mark token as used
    await this.accessTokenRepository.markAsUsed(token);

    // Update user's last connection
    if (accessToken.userId) {
      await this.userService.updateLastConnection(accessToken.userId);
    }

    this.logger.log(`Access token validated: ${token.substring(0, 8)}...`);
    return {
      valid: true,
      userId: accessToken.userId,
      metadata: accessToken.metadata,
    };
  }
}
