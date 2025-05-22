import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IdentityCard, IdentityCardDocument } from '../schemas/identity-card.schema';
import { CompanyIdentityCard } from '../entities/company-identity-card.entity';
import { UserRepository } from '../../user/repositories/user.repository';

@Injectable()
export class IdentityCardRepository {
  private readonly logger = new Logger(IdentityCardRepository.name);

  constructor(
    @InjectModel(IdentityCard.name) private identityCardModel: Model<IdentityCardDocument>,
    private userRepository: UserRepository,
  ) {}

  /**
   * Save an identity card to the database
   */
  async save(identityCardData: any): Promise<IdentityCardDocument> {
    const newIdentityCard = new this.identityCardModel(identityCardData);
    return await newIdentityCard.save();
  }

  /**
   * Find a user by ID
   */
  async findUserById(userId: string): Promise<any> {
    try {
      return await this.userRepository.findById(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Find an identity card by company ID
   */
  async findById(companyId: string): Promise<IdentityCardDocument> {
    const identityCard = await this.identityCardModel.findOne({ id: companyId }).exec();

    if (!identityCard) {
      throw new NotFoundException(`Identity card with ID ${companyId} not found`);
    }

    return identityCard;
  }

  /**
   * Find all identity cards, optionally filtered by user ID
   */
  async findAll(userId?: string): Promise<IdentityCardDocument[]> {
    const query: any = {};

    if (userId) {
      query.userId = userId;
    }

    return await this.identityCardModel.find(query).sort({ updatedAt: -1 }).exec();
  }

  /**
   * Update an identity card
   */
  async update(companyId: string, updateData: any): Promise<IdentityCardDocument> {
    const updatedCard = await this.identityCardModel
      .findOneAndUpdate(
        { id: companyId },
        { $set: updateData },
        { new: true }, // Return the updated document
      )
      .exec();

    if (!updatedCard) {
      throw new NotFoundException(`Identity card with ID ${companyId} not found after update`);
    }

    return updatedCard;
  }

  /**
   * Delete an identity card
   */
  async remove(companyId: string): Promise<void> {
    await this.identityCardModel.deleteOne({ id: companyId }).exec();
  }

  /**
   * Map database document to entity
   */
  mapToEntity(document: IdentityCardDocument): CompanyIdentityCard {
    return {
      companyId: document.id,
      brandName: document.brandName,
      website: document.website,
      industry: document.industry,
      market: document.market,
      shortDescription: document.shortDescription,
      fullDescription: document.fullDescription,
      keyBrandAttributes: document.keyBrandAttributes,
      competitors: document.competitors,
      updatedAt: document.updatedAt instanceof Date ? document.updatedAt : new Date(),
      userId: document.userId,
      language: document.language,
    };
  }
}
