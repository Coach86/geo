import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationResponseDto } from '../dto/organization-response.dto';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationDocument } from '../schemas/organization.schema';
import { Organization as OrganizationEntity } from '../entities/organization.entity';
import { ORGANIZATION_DEFAULTS, UNLIMITED_VALUE } from '../constants/defaults';
import { ConfigService } from '../../config/services/config.service';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private organizationRepository: OrganizationRepository,
    private configService: ConfigService,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    try {
      this.logger.log(`Creating organization`);

      // Get default models from config if selectedModels not provided
      const defaultModels = this.configService.getDefaultModels();
      const selectedModels = createOrganizationDto.selectedModels || defaultModels;

      const organizationData = {
        id: uuidv4(),
        planSettings: {
          maxProjects: createOrganizationDto.planSettings?.maxProjects || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_PROJECTS,
          maxAIModels: createOrganizationDto.planSettings?.maxAIModels || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_AI_MODELS,
          maxSpontaneousPrompts: createOrganizationDto.planSettings?.maxSpontaneousPrompts || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_SPONTANEOUS_PROMPTS,
          maxUrls: createOrganizationDto.planSettings?.maxUrls || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_URLS,
          maxUsers: createOrganizationDto.planSettings?.maxUsers || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_USERS,
        },
        selectedModels,
      };

      const savedOrganization = await this.organizationRepository.save(organizationData);
      return this.mapToResponseDto(savedOrganization);
    } catch (error) {
      this.logger.error(`Failed to create organization: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(): Promise<OrganizationResponseDto[]> {
    try {
      const organizations = await this.organizationRepository.findAll();
      return Promise.all(organizations.map((org) => this.mapToResponseDto(org)));
    } catch (error) {
      this.logger.error(`Failed to find organizations: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<OrganizationResponseDto> {
    try {
      const organization = await this.organizationRepository.findById(id);
      if (!organization) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }
      return this.mapToResponseDto(organization);
    } catch (error) {
      this.logger.error(`Failed to find organization: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByStripeCustomerId(stripeCustomerId: string): Promise<OrganizationResponseDto | null> {
    try {
      const organization = await this.organizationRepository.findByStripeCustomerId(stripeCustomerId);
      if (!organization) {
        return null;
      }
      return this.mapToResponseDto(organization);
    } catch (error) {
      this.logger.error(`Failed to find organization by stripe customer: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<OrganizationResponseDto> {
    try {
      // Check if organization exists
      const currentOrg = await this.findOne(id);

      // Prepare update data, merging plan settings properly
      const updateData: any = {
        ...updateOrganizationDto,
      };

      if (updateOrganizationDto.planSettings) {
        updateData.planSettings = {
          ...currentOrg.planSettings,
          ...updateOrganizationDto.planSettings,
        };
      }

      const updatedOrganization = await this.organizationRepository.update(id, updateData);
      if (!updatedOrganization) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }
      return this.mapToResponseDto(updatedOrganization);
    } catch (error) {
      this.logger.error(`Failed to update organization: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updatePlanSettings(
    id: string,
    planSettings: Partial<{
      maxProjects: number;
      maxAIModels: number;
      maxSpontaneousPrompts: number;
      maxUrls: number;
      maxUsers: number;
      maxCompetitors: number;
    }>,
  ): Promise<OrganizationResponseDto> {
    try {
      const organization = await this.findOne(id);

      // Validate that current usage doesn't exceed new limits
      const currentUsers = await this.organizationRepository.countUsersByOrganizationId(id);
      const currentProjects = await this.organizationRepository.countProjectsByOrganizationId(id);

      if (planSettings.maxUsers !== undefined && planSettings.maxUsers !== UNLIMITED_VALUE && currentUsers > planSettings.maxUsers) {
        throw new BadRequestException(
          `Cannot set maxUsers to ${planSettings.maxUsers}. Organization currently has ${currentUsers} users.`
        );
      }

      if (planSettings.maxProjects !== undefined && currentProjects > planSettings.maxProjects) {
        throw new BadRequestException(
          `Cannot set maxProjects to ${planSettings.maxProjects}. Organization currently has ${currentProjects} projects.`
        );
      }

      const updatedOrganization = await this.organizationRepository.update(id, {
        planSettings: {
          ...organization.planSettings,
          ...planSettings,
        },
      });

      if (!updatedOrganization) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      return this.mapToResponseDto(updatedOrganization);
    } catch (error) {
      this.logger.error(`Failed to update plan settings: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateSelectedModels(id: string, selectedModels: string[]): Promise<OrganizationResponseDto> {
    try {
      const organization = await this.findOne(id);

      // Validate that selected models don't exceed plan limit
      if (selectedModels.length > organization.planSettings.maxAIModels) {
        throw new BadRequestException(
          `Cannot select ${selectedModels.length} models. Plan limit is ${organization.planSettings.maxAIModels}.`
        );
      }

      const updatedOrganization = await this.organizationRepository.update(id, { selectedModels });
      if (!updatedOrganization) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      return this.mapToResponseDto(updatedOrganization);
    } catch (error) {
      this.logger.error(`Failed to update selected models: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      // Check if organization exists
      await this.findOne(id);

      // Check if organization has any users
      const userCount = await this.organizationRepository.countUsersByOrganizationId(id);
      if (userCount > 0) {
        throw new BadRequestException(
          `Cannot delete organization with ID ${id}. It still has ${userCount} users.`
        );
      }

      // Delete all projects linked to this organization
      const deletedProjectsCount = await this.organizationRepository.deleteProjectsByOrganizationId(id);
      if (deletedProjectsCount > 0) {
        this.logger.log(`Deleted ${deletedProjectsCount} projects for organization ${id}`);
      }

      // Delete the organization
      await this.organizationRepository.remove(id);

      this.logger.log(`Successfully deleted organization with ID ${id}`);
    } catch (error) {
      this.logger.error(`Failed to remove organization: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getProjectCount(organizationId: string): Promise<number> {
    try {
      return await this.organizationRepository.countProjectsByOrganizationId(organizationId);
    } catch (error) {
      this.logger.error(`Failed to get project count: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async mapToResponseDto(organization: OrganizationDocument): Promise<OrganizationResponseDto> {
    const entity = this.organizationRepository.mapToEntity(organization);

    // Get current usage counts
    const currentUsers = await this.organizationRepository.countUsersByOrganizationId(entity.id);
    const currentProjects = await this.organizationRepository.countProjectsByOrganizationId(entity.id);

    return {
      id: entity.id,
      stripeCustomerId: entity.stripeCustomerId,
      stripePlanId: entity.stripePlanId,
      planSettings: entity.planSettings,
      selectedModels: entity.selectedModels,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      currentUsers,
      currentProjects,
    };
  }
}
