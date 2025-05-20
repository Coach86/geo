import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AccessToken,
  AccessTokenDocument,
} from '../schemas/access-token.schema';

/**
 * Repository for AccessToken MongoDB documents
 * Handles all direct interactions with the MongoDB model
 */
@Injectable()
export class AccessTokenRepository {
  private readonly logger = new Logger(AccessTokenRepository.name);

  constructor(
    @InjectModel(AccessToken.name)
    private accessTokenModel: Model<AccessTokenDocument>,
  ) {}

  /**
   * Create a new access token
   * @param accessTokenData Data to create the access token with
   * @returns The created access token document
   */
  async create(accessTokenData: Partial<AccessToken>): Promise<AccessTokenDocument> {
    this.logger.debug(`Creating new access token for user ${accessTokenData.userId}`);
    const newAccessToken = new this.accessTokenModel(accessTokenData);
    return newAccessToken.save();
  }

  /**
   * Find an access token by its token string
   * @param token The token string
   * @returns The access token document or null if not found
   */
  async findByToken(token: string): Promise<AccessTokenDocument | null> {
    this.logger.debug(`Finding access token: ${token.substring(0, 8)}...`);
    const accessToken = await this.accessTokenModel.findOne({ token }).exec();
    return accessToken;
  }

  /**
   * Find all access tokens for a user
   * @param userId The user ID
   * @returns Array of access tokens
   */
  async findAllByUserId(userId: string): Promise<AccessTokenDocument[]> {
    this.logger.debug(`Finding all access tokens for user: ${userId}`);
    const accessTokens = await this.accessTokenModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
    return accessTokens;
  }

  /**
   * Find all valid (not expired and not used) access tokens for a user
   * @param userId The user ID
   * @returns Array of valid access tokens
   */
  async findValidByUserId(userId: string): Promise<AccessTokenDocument[]> {
    this.logger.debug(`Finding valid access tokens for user: ${userId}`);
    const now = new Date();
    const accessTokens = await this.accessTokenModel
      .find({
        userId,
        expiresAt: { $gt: now },
        used: false,
      })
      .sort({ createdAt: -1 })
      .exec();
    return accessTokens;
  }

  /**
   * Mark an access token as used
   * @param token The token string
   * @returns The updated access token
   */
  async markAsUsed(token: string): Promise<AccessTokenDocument | null> {
    this.logger.debug(`Marking access token as used: ${token.substring(0, 8)}...`);
    return this.accessTokenModel
      .findOneAndUpdate({ token }, { used: true }, { new: true })
      .exec();
  }

  /**
   * Delete expired tokens for a user
   * @param userId The user ID
   * @returns The number of tokens deleted
   */
  async deleteExpiredByUserId(userId: string): Promise<number> {
    this.logger.debug(`Deleting expired tokens for user: ${userId}`);
    const now = new Date();
    const result = await this.accessTokenModel
      .deleteMany({
        userId,
        expiresAt: { $lt: now },
      })
      .exec();
    return result.deletedCount;
  }

  /**
   * Delete all tokens for a user
   * @param userId The user ID
   * @returns The number of tokens deleted
   */
  async deleteAllByUserId(userId: string): Promise<number> {
    this.logger.debug(`Deleting all tokens for user: ${userId}`);
    const result = await this.accessTokenModel.deleteMany({ userId }).exec();
    return result.deletedCount;
  }

  /**
   * Delete tokens older than a certain date
   * @param cutoffDate The date to delete tokens before
   * @returns The number of tokens deleted
   */
  async deleteTokensOlderThan(cutoffDate: Date): Promise<number> {
    this.logger.debug(`Deleting tokens older than: ${cutoffDate.toISOString()}`);
    const result = await this.accessTokenModel
      .deleteMany({
        createdAt: { $lt: cutoffDate },
      })
      .exec();
    return result.deletedCount;
  }
}