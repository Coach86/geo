import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { User as UserEntity } from '../entities/user.entity';
import {
  IdentityCard,
  IdentityCardDocument,
} from '../../identity-card/schemas/identity-card.schema';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(IdentityCard.name) private identityCardModel: Model<IdentityCardDocument>,
  ) {}

  /**
   * Save a user to the database
   */
  async save(userData: Partial<UserEntity>): Promise<UserDocument> {
    const newUser = new this.userModel(userData);
    return await newUser.save();
  }

  /**
   * Find a user by ID
   */
  async findById(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ id: userId }).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return await this.userModel.findOne({ email }).exec();
  }

  /**
   * Find all users
   */
  async findAll(): Promise<UserDocument[]> {
    return await this.userModel.find().sort({ updatedAt: -1 }).exec();
  }

  /**
   * Update a user
   */
  async update(userId: string, updateData: Partial<UserEntity>): Promise<UserDocument> {
    const updatedUser = await this.userModel
      .findOneAndUpdate(
        { id: userId },
        { $set: updateData },
        { new: true }, // Return the updated document
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return updatedUser;
  }

  /**
   * Delete a user
   */
  async remove(userId: string): Promise<void> {
    const result = await this.userModel.deleteOne({ id: userId }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  /**
   * Get company identity cards for a user
   */
  async findCompaniesForUser(userId: string): Promise<IdentityCardDocument[]> {
    return await this.identityCardModel.find({ userId }).sort({ updatedAt: -1 }).exec();
  }

  /**
   * Map database document to entity
   */
  mapToEntity(document: UserDocument): UserEntity {
    return {
      id: document.id,
      email: document.email,
      language: document.language,
      phoneNumber: document.phoneNumber,
      stripeCustomerId: document.stripeCustomerId,
      stripePlanId: document.stripePlanId,
      planSettings: document.planSettings || {
        maxBrands: 1,
        maxAIModels: 3,
      },
      selectedModels: document.selectedModels || [],
      createdAt: document.createdAt instanceof Date ? document.createdAt : new Date(),
      updatedAt: document.updatedAt instanceof Date ? document.updatedAt : new Date(),
    };
  }

  /**
   * Map database document to entity with company relationship
   */
  async mapToEntityWithCompanies(document: UserDocument): Promise<UserEntity> {
    const entity = this.mapToEntity(document);
    const companies = await this.findCompaniesForUser(document.id);

    if (companies && companies.length > 0) {
      entity.companies = companies.map((company) => ({
        companyId: company.id,
        brandName: company.brandName,
        website: company.website,
        industry: company.industry,
        market: company.market,
        shortDescription: company.shortDescription,
        fullDescription: company.fullDescription,
        keyBrandAttributes: company.keyBrandAttributes,
        competitors: company.competitors,
        updatedAt: company.updatedAt instanceof Date ? company.updatedAt : new Date(),
        userId: company.userId,
        language: company.language,
      }));
    }

    return entity;
  }
}
