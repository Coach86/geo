import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';
import { AccessToken, AccessTokenDocument } from '../schemas/access-token.schema';
import { AccessTokenRepository } from '../repositories/access-token.repository';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly accessTokenRepository: AccessTokenRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a secure access token for a user
   */
  async generateAccessToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiryHours = this.configService.get<number>('REPORT_TOKEN_EXPIRY_HOURS') || 24;
    const expiresAt = addDays(new Date(), expiryHours / 24); // Convert hours to days

    await this.accessTokenRepository.create({
      token,
      userId,
      expiresAt,
    });
    this.logger.log(`Generated new access token for user ${userId}`);
    return token;
  }

  /**
   * Validate an access token
   */
  async validateAccessToken(token: string): Promise<{ valid: boolean; userId?: string }> {
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

    this.logger.log(`Access token validated: ${token.substring(0, 8)}...`);
    return {
      valid: true,
      userId: accessToken.userId,
    };
  }
}
