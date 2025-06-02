import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { User as UserEntity } from '../entities/user.entity';
import {
  Project,
  ProjectDocument,
} from '../../project/schemas/project-base.schema';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
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
   * Get projects for a user
   */
  async findProjectsForUser(userId: string): Promise<ProjectDocument[]> {
    return await this.projectModel.find({ userId }).sort({ updatedAt: -1 }).exec();
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
        maxProjects: 1,
        maxAIModels: 3,
      },
      selectedModels: document.selectedModels || [],
      createdAt: document.createdAt instanceof Date ? document.createdAt : new Date(),
      updatedAt: document.updatedAt instanceof Date ? document.updatedAt : new Date(),
    };
  }

  /**
   * Map database document to entity with project relationship
   */
  async mapToEntityWithProjects(document: UserDocument): Promise<UserEntity> {
    const entity = this.mapToEntity(document);
    const projects = await this.findProjectsForUser(document.id);

    if (projects && projects.length > 0) {
      entity.projects = projects.map((project) => ({
        projectId: project.id,
        brandName: project.brandName,
        website: project.website,
        industry: project.industry,
        market: project.market,
        shortDescription: project.shortDescription,
        fullDescription: project.fullDescription,
        keyBrandAttributes: project.keyBrandAttributes,
        competitors: project.competitors,
        updatedAt: project.updatedAt instanceof Date ? project.updatedAt : new Date(),
        userId: project.userId,
        language: project.language,
      }));
    }

    return entity;
  }
}
