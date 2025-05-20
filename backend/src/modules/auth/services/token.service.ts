import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';
import { AccessToken, AccessTokenDocument } from '../schemas/access-token.schema';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectModel(AccessToken.name)
    private accessTokenModel: Model<AccessTokenDocument>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a secure access token for a user
   */
  async generateAccessToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiryHours = this.configService.get<number>('REPORT_TOKEN_EXPIRY_HOURS') || 24;
    const expiresAt = addDays(new Date(), expiryHours / 24); // Convert hours to days

    const accessToken = new this.accessTokenModel({
      token,
      userId,
      expiresAt,
    });

    await accessToken.save();
    this.logger.log(`Generated new access token for user ${userId}`);
    return token;
  }

  /**
   * Validate an access token
   */
  async validateAccessToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    const accessToken = await this.accessTokenModel.findOne({ token }).lean().exec();

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
    await this.accessTokenModel.updateOne({ _id: accessToken._id }, { $set: { used: true } });

    this.logger.log(`Access token validated: ${token.substring(0, 8)}...`);
    return {
      valid: true,
      userId: accessToken.userId,
    };
  }
}
