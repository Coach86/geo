import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationResponseDto } from '../dto/organization-response.dto';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationDocument } from '../schemas/organization.schema';
import { Organization as OrganizationEntity } from '../entities/organization.entity';
import { ORGANIZATION_DEFAULTS, UNLIMITED_VALUE } from '../constants/defaults';
import { ConfigService } from '../../config/services/config.service';
import { PlanService } from '../../plan/services/plan.service';
import { OrganizationPlanUpdatedEvent } from '../events/organization-plan-updated.event';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private organizationRepository: OrganizationRepository,
    private configService: ConfigService,
    @Inject(forwardRef(() => PlanService))
    private planService: PlanService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    try {
      this.logger.log(`Creating organization`);

      // Get default models from config if selectedModels not provided
      const defaultModels = this.configService.getDefaultModels();
      let selectedModels = createOrganizationDto.selectedModels || defaultModels;
      
      // Try to find the free plan
      let stripePlanId: string | undefined;
      let planSettings = createOrganizationDto.planSettings;
      
      try {
        const freePlan = await this.planService.findFreePlan();
        if (freePlan && !createOrganizationDto.stripePlanId) {
          // Use free plan settings if no plan is specified
          stripePlanId = freePlan.id;
          planSettings = {
            maxProjects: freePlan.maxProjects,
            maxAIModels: freePlan.maxModels,
            maxSpontaneousPrompts: freePlan.maxSpontaneousPrompts,
            maxUrls: freePlan.maxUrls,
            maxUsers: freePlan.maxUsers,
            maxCompetitors: freePlan.maxCompetitors,
          };
          
          // Limit selected models to the free plan's limit
          if (selectedModels.length > freePlan.maxModels) {
            selectedModels = selectedModels.slice(0, freePlan.maxModels);
          }
          
          this.logger.log(`Assigning free plan to new organization`);
        }
      } catch (error) {
        this.logger.warn(`Could not find free plan: ${error.message}`);
      }

      const organizationData = {
        id: uuidv4(),
        name: createOrganizationDto.name,
        shopifyShopDomain: createOrganizationDto.shopifyShopDomain,
        stripePlanId: stripePlanId || createOrganizationDto.stripePlanId,
        planSettings: {
          maxProjects: planSettings?.maxProjects || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_PROJECTS,
          maxAIModels: planSettings?.maxAIModels || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_AI_MODELS,
          maxSpontaneousPrompts: planSettings?.maxSpontaneousPrompts || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_SPONTANEOUS_PROMPTS,
          maxUrls: planSettings?.maxUrls || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_URLS,
          maxUsers: planSettings?.maxUsers || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_USERS,
          maxCompetitors: planSettings?.maxCompetitors || ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_COMPETITORS,
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

  async findAll(includeProjects: boolean = false): Promise<OrganizationResponseDto[]> {
    try {
      const organizations = await this.organizationRepository.findAll();
      return Promise.all(organizations.map((org) => this.mapToResponseDto(org, includeProjects)));
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

  async findByShopDomain(shopDomain: string): Promise<OrganizationResponseDto[]> {
    try {
      const organizations = await this.organizationRepository.findByShopDomain(shopDomain);
      return Promise.all(organizations.map((org) => this.mapToResponseDto(org)));
    } catch (error) {
      this.logger.error(`Failed to find organization by shop domain: ${error.message}`, error.stack);
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

      // Get available models from configuration
      const availableModels = this.configService.getAvailableModels();
      const availableModelIds = availableModels.filter(m => m.enabled).map(m => m.id);

      // Validate that all selected models are available and enabled
      const invalidModels = selectedModels.filter(id => !availableModelIds.includes(id));
      if (invalidModels.length > 0) {
        throw new BadRequestException(`Invalid models selected: ${invalidModels.join(', ')}`);
      }

      // Check for premium models if organization is not on a paid plan
      // Free plans are identified by having no stripe subscription
      const isPaidPlan = !!organization.stripeSubscriptionId && organization.subscriptionStatus === 'active';
      if (!isPaidPlan) {
        const premiumModels = availableModels.filter(m => m.premium && selectedModels.includes(m.id));
        if (premiumModels.length > 0) {
          const premiumModelNames = premiumModels.map(m => m.name).join(', ');
          throw new BadRequestException(
            `Premium models (${premiumModelNames}) are only available for paid plans. Please upgrade your plan to access these models.`
          );
        }
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

  private async mapToResponseDto(organization: OrganizationDocument, includeProjects: boolean = false): Promise<OrganizationResponseDto> {
    const entity = this.organizationRepository.mapToEntity(organization);

    // Get current usage counts
    const currentUsers = await this.organizationRepository.countUsersByOrganizationId(entity.id);
    const currentProjects = await this.organizationRepository.countProjectsByOrganizationId(entity.id);
    
    // Get project details if requested
    const projects = includeProjects ? await this.organizationRepository.getProjectsByOrganizationId(entity.id) : undefined;

    return {
      id: entity.id,
      name: entity.name,
      shopifyShopDomain: entity.shopifyShopDomain,
      stripeCustomerId: entity.stripeCustomerId,
      stripePlanId: entity.stripePlanId,
      stripeSubscriptionId: entity.stripeSubscriptionId,
      subscriptionStatus: entity.subscriptionStatus,
      subscriptionCurrentPeriodEnd: entity.subscriptionCurrentPeriodEnd?.toISOString(),
      subscriptionCancelAt: entity.subscriptionCancelAt?.toISOString(),
      planSettings: entity.planSettings,
      selectedModels: entity.selectedModels,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      currentUsers,
      currentProjects,
      projects,
      trialStartDate: entity.trialStartDate?.toISOString(),
      trialEndDate: entity.trialEndDate?.toISOString(),
      isOnTrial: entity.isOnTrial,
      trialPlanId: entity.trialPlanId,
      promoCode: entity.promoCode,
      hasActivatedFreePlan: entity.hasActivatedFreePlan,
      freePlanActivatedAt: entity.freePlanActivatedAt?.toISOString(),
    };
  }

  async activateTrial(organizationId: string, planId: string, trialDays: number, promoCode?: string): Promise<OrganizationResponseDto> {
    try {
      this.logger.log(`Activating trial for organization ${organizationId} - Plan: ${planId}, Days: ${trialDays}, Promo: ${promoCode}`);

      // Get the plan details
      const plan = await this.planService.findById(planId);
      if (!plan) {
        throw new NotFoundException(`Plan with ID ${planId} not found`);
      }

      // Calculate trial dates
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);

      // Update organization with trial information
      // SECURITY FIX: Do NOT set stripePlanId during trial activation
      // stripePlanId should only be set after successful Stripe checkout
      const updateData: any = {
        isOnTrial: true,
        trialStartDate,
        trialEndDate,
        trialPlanId: planId,
        // stripePlanId: planId, // REMOVED - Critical security fix
        planSettings: {
          maxProjects: plan.maxProjects,
          maxAIModels: plan.maxModels,
          maxSpontaneousPrompts: plan.maxSpontaneousPrompts,
          maxUrls: plan.maxUrls,
          maxUsers: plan.maxUsers,
          maxCompetitors: plan.maxCompetitors,
        },
      };

      // Add promo code if provided
      if (promoCode) {
        updateData.promoCode = promoCode;
      }

      const updatedOrganization = await this.organizationRepository.update(organizationId, updateData);

      if (!updatedOrganization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      this.logger.log(`Trial activated successfully for organization ${organizationId}`);
      
      // Get all users in the organization to update their Loops profiles
      const orgUsers = await this.userService.findByOrganizationId(organizationId);
      const userEmails = orgUsers.map((u: any) => u.email);
      
      // Emit organization plan update event for Loops
      this.eventEmitter.emit(
        'organization.plan.updated',
        new OrganizationPlanUpdatedEvent(
          organizationId,
          plan.name,
          trialStartDate,
          true, // isOnTrial
          userEmails,
          trialEndDate, // trialEndsAt
          'trialing', // subscriptionStatus
        ),
      );
      
      return this.mapToResponseDto(updatedOrganization);
    } catch (error) {
      this.logger.error(`Failed to activate trial: ${error.message}`, error.stack);
      throw error;
    }
  }

  async checkAndExpireTrials(): Promise<void> {
    try {
      const now = new Date();
      
      // Find all organizations with expired trials
      const expiredTrials = await this.organizationRepository.findExpiredTrials(now);
      
      for (const organization of expiredTrials) {
        this.logger.log(`Expiring trial for organization ${organization.id}`);
        
        // Find the free plan to downgrade to
        const freePlan = await this.planService.findFreePlan();
        if (!freePlan) {
          this.logger.error('No free plan found for downgrade');
          continue;
        }

        // Downgrade to free plan
        await this.organizationRepository.update(organization.id, {
          isOnTrial: false,
          stripePlanId: freePlan.id,
          planSettings: {
            maxProjects: freePlan.maxProjects,
            maxAIModels: freePlan.maxModels,
            maxSpontaneousPrompts: freePlan.maxSpontaneousPrompts,
            maxUrls: freePlan.maxUrls,
            maxUsers: freePlan.maxUsers,
            maxCompetitors: freePlan.maxCompetitors,
          },
        });

        this.logger.log(`Organization ${organization.id} downgraded to free plan after trial expiry`);
        
        // Get all users in the organization to update their Loops profiles
        const orgUsers = await this.userService.findByOrganizationId(organization.id);
        const userEmails = orgUsers.map((u: any) => u.email);
        
        // Emit organization plan update event for Loops (trial expired, back to free)
        this.eventEmitter.emit(
          'organization.plan.updated',
          new OrganizationPlanUpdatedEvent(
            organization.id,
            'Free',
            new Date(),
            false, // isOnTrial
            userEmails,
            undefined, // trialEndsAt
            'trial_expired', // subscriptionStatus
          ),
        );
      }
    } catch (error) {
      this.logger.error(`Failed to check and expire trials: ${error.message}`, error.stack);
    }
  }
}
