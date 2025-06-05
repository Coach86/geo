import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from '../schemas/organization.schema';
import { Organization as OrganizationEntity } from '../entities/organization.entity';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { Project, ProjectDocument } from '../../project/schemas/project-base.schema';
import { ORGANIZATION_DEFAULTS } from '../constants/defaults';

@Injectable()
export class OrganizationRepository {
  private readonly logger = new Logger(OrganizationRepository.name);

  constructor(
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Project.name)
    private projectModel: Model<ProjectDocument>,
  ) {}

  async save(organizationData: Partial<OrganizationEntity>): Promise<OrganizationDocument> {
    try {
      const organization = new this.organizationModel(organizationData);
      return await organization.save();
    } catch (error) {
      this.logger.error('Failed to save organization', error);
      throw error;
    }
  }

  async findAll(): Promise<OrganizationDocument[]> {
    try {
      return await this.organizationModel.find().exec();
    } catch (error) {
      this.logger.error('Failed to find organizations', error);
      throw error;
    }
  }

  async findById(id: string): Promise<OrganizationDocument | null> {
    try {
      return await this.organizationModel.findOne({ id }).exec();
    } catch (error) {
      this.logger.error(`Failed to find organization with id: ${id}`, error);
      throw error;
    }
  }

  async findByStripeCustomerId(stripeCustomerId: string): Promise<OrganizationDocument | null> {
    try {
      return await this.organizationModel.findOne({ stripeCustomerId }).exec();
    } catch (error) {
      this.logger.error(`Failed to find organization with stripeCustomerId: ${stripeCustomerId}`, error);
      throw error;
    }
  }

  async update(id: string, updateData: Partial<OrganizationEntity>): Promise<OrganizationDocument | null> {
    try {
      return await this.organizationModel
        .findOneAndUpdate({ id }, updateData, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to update organization with id: ${id}`, error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.organizationModel.deleteOne({ id }).exec();
    } catch (error) {
      this.logger.error(`Failed to remove organization with id: ${id}`, error);
      throw error;
    }
  }

  async deleteProjectsByOrganizationId(organizationId: string): Promise<number> {
    try {
      const result = await this.projectModel.deleteMany({ organizationId }).exec();
      return result.deletedCount || 0;
    } catch (error) {
      this.logger.error(`Failed to delete projects for organization: ${organizationId}`, error);
      throw error;
    }
  }

  async countUsersByOrganizationId(organizationId: string): Promise<number> {
    try {
      return await this.userModel.countDocuments({ organizationId }).exec();
    } catch (error) {
      this.logger.error(`Failed to count users for organization: ${organizationId}`, error);
      throw error;
    }
  }

  async countProjectsByOrganizationId(organizationId: string): Promise<number> {
    try {
      return await this.projectModel.countDocuments({ organizationId }).exec();
    } catch (error) {
      this.logger.error(`Failed to count projects for organization: ${organizationId}`, error);
      throw error;
    }
  }

  mapToEntity(document: OrganizationDocument): OrganizationEntity {
    return {
      id: document.id,
      stripeCustomerId: document.stripeCustomerId,
      stripePlanId: document.stripePlanId,
      stripeSubscriptionId: document.stripeSubscriptionId,
      subscriptionStatus: document.subscriptionStatus,
      subscriptionCurrentPeriodEnd: document.subscriptionCurrentPeriodEnd,
      planSettings: {
        maxProjects: document.planSettings?.maxProjects || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_PROJECTS,
        maxAIModels: document.planSettings?.maxAIModels || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_AI_MODELS,
        maxSpontaneousPrompts: document.planSettings?.maxSpontaneousPrompts || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_SPONTANEOUS_PROMPTS,
        maxUrls: document.planSettings?.maxUrls || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_URLS,
        maxUsers: document.planSettings?.maxUsers || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_USERS,
        maxCompetitors: document.planSettings?.maxCompetitors || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_COMPETITORS || 5,
      },
      selectedModels: document.selectedModels || [],
      createdAt: document.createdAt || new Date(),
      updatedAt: document.updatedAt || new Date(),
    };
  }
}