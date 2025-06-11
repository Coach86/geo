import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptSetRepository } from '../repositories/prompt-set.repository';
import { ProjectCreatedEvent } from '../../project/events/project-created.event';
import { LlmService } from '../../llm/services/llm.service';
import { z } from 'zod';
import { spontaneousSystemPrompt, spontaneousUserPrompt } from './spontaneous-prompts';
import { directSystemPrompt, directUserPrompt } from './direct-prompts';
import { comparisonSystemPrompt, comparisonUserPrompt } from './comparison-prompts';
import { accuracySystemPrompt, accuracyUserPrompt } from './accuracy-prompts';
import { brandBattleSystemPrompt, brandBattleUserPrompt } from './brand-battle-prompts';
import { Project } from '../../project/entities/project.entity';
import { PromptSet, PromptSetDocument } from '../schemas/prompt-set.schema';
import { ProjectRepository } from '../../project/repositories/project.repository';
import { LlmProvider } from '@/modules/llm/interfaces/llm-provider.enum';

@Injectable()
export class PromptService implements OnModuleInit {
  private readonly logger = new Logger(PromptService.name);
  private spontPromptCount: number;
  private directPromptCount: number;
  private comparisonPromptCount: number;
  private accuracyPromptCount: number;
  private brandBattlePromptCount: number;

  constructor(
    private readonly promptSetRepository: PromptSetRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly configService: ConfigService,
    private readonly llmService: LlmService,
  ) {}

  onModuleInit() {
    // Load prompt counts from configuration
    this.spontPromptCount = this.configService.get<number>('SPONT_PROMPTS', 15);
    this.directPromptCount = this.configService.get<number>('DIRECT_PROMPTS', 3);
    this.comparisonPromptCount = this.configService.get<number>('COMP_PROMPTS', 5);
    this.accuracyPromptCount = this.configService.get<number>('ACCURACY_PROMPTS', 3);
    this.brandBattlePromptCount = this.configService.get<number>('BRAND_BATTLE_PROMPTS', 1);

    this.logger.log(
      `Initialized with ${this.spontPromptCount} spontaneous prompts, ${this.directPromptCount} direct prompts, ` +
        `${this.comparisonPromptCount} comparison prompts, ${this.accuracyPromptCount} accuracy prompts, ` +
        `${this.brandBattlePromptCount} brand battle prompts`,
    );
  }

  /**
   * Get a project by ID using the identity card repository
   * @param projectId The ID of the project to get
   * @returns The project identity card or null if not found
   */
  async getProjectById(projectId: string): Promise<Project | null> {
    try {
      const document = await this.projectRepository.findById(projectId);
      if (!document) {
        return null;
      }

      // Map the document to the entity format
      return this.projectRepository.mapToEntity(document);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  @OnEvent('project.created')
  async handleProjectCreated(event: ProjectCreatedEvent) {
    this.logger.log(`Generating prompts for new project: ${event.projectId}`);

    try {
      // Check if a prompt set already exists for this project
      const existingPromptSet = await this.promptSetRepository.findByProjectId(event.projectId);

      if (existingPromptSet) {
        this.logger.log(`Prompt set already exists for project ${event.projectId}`);
        return;
      }

      // Fetch the project details to create context-specific prompts
      const projectRaw = await this.projectRepository.findById(event.projectId);

      if (!projectRaw) {
        this.logger.error(`Project ${event.projectId} not found when generating prompts`);
        return;
      }

      // Map raw DB result to Project
      const project: Project = {
        projectId: projectRaw.id,
        brandName: projectRaw.brandName,
        website: projectRaw.website,
        industry: projectRaw.industry,
        shortDescription: projectRaw.shortDescription,
        fullDescription: projectRaw.fullDescription,
        objectives: projectRaw.objectives,
        keyBrandAttributes: projectRaw.keyBrandAttributes,
        competitors: projectRaw.competitors,
        updatedAt: projectRaw.updatedAt instanceof Date ? projectRaw.updatedAt : new Date(),
        organizationId: projectRaw.organizationId,
        market: projectRaw.market,
        language: projectRaw.language,
      };

      const promptSet = await this.generatePromptSet(project);

      // Save to database
      await this.promptSetRepository.create({
        id: event.projectId,
        projectId: event.projectId,
        spontaneous: promptSet.spontaneous,
        direct: promptSet.direct,
        comparison: promptSet.comparison,
        accuracy: promptSet.accuracy,
        brandBattle: promptSet.brandBattle,
      });

      this.logger.log(`Successfully generated prompts for project ${event.projectId}`);
    } catch (error) {
      this.logger.error(`Failed to generate prompts: ${error.message}`, error.stack);
    }
  }

  @OnEvent('project.deleted')
  async handleProjectDeleted(event: { projectId: string }) {
    const { projectId } = event;
    await this.promptSetRepository.deleteByProjectId(projectId);
    this.logger.log(`Cleaned up prompt sets for deleted project ${projectId}`);
  }

  async generatePromptSet(project: Project) {
    // Parse company info to ensure we have all fields
    const brandName = project.brandName;
    const industry = project.industry;
    const competitors = project.competitors;
    const keyBrandAttributes = project.keyBrandAttributes;
    const websiteUrl = project.website;
    const market = project.market;
    const language = project.language;
    // Generate all prompts using LLM
    const [spontaneous, direct, comparison, accuracy, brandBattle] = await Promise.all([
      this.generateSpontaneousPrompts(
        websiteUrl,
        industry,
        brandName,
        market,
        language,
        this.spontPromptCount,
        competitors,
      ),
      this.generateDirectBrandPrompts(
        brandName,
        market,
        language,
        this.directPromptCount,
        websiteUrl,
      ),
      this.generateComparisonPrompts(
        brandName,
        competitors,
        industry,
        keyBrandAttributes,
        market,
        language,
        this.comparisonPromptCount,
      ),
      this.generateAccuracyPrompts(
        brandName,
        market,
        language,
        keyBrandAttributes,
        this.accuracyPromptCount,
      ),
      this.generateBrandBattlePrompts(
        brandName,
        competitors,
        market,
        language,
        this.brandBattlePromptCount,
      ),
    ]);

    return { spontaneous, direct, comparison, accuracy, brandBattle };
  }

  private async generateSpontaneousPrompts(
    websiteUrl: string,
    industry: string,
    brandName: string,
    market: string,
    language: string,
    count: number,
    competitors: string[],
  ): Promise<string[]> {
    // Define our schema for the LLM output
    const promptsSchema = z.object({
      prompts: z.array(z.string()),
    });

    // Call LLM with structured output processing
    const result = await this.llmService.getStructuredOutput(
      LlmProvider.OpenAI,
      spontaneousUserPrompt({
        market,
        websiteUrl,
        industry,
        brandName,
        count,
        competitors,
        language,
      }),
      promptsSchema,
      { systemPrompt: spontaneousSystemPrompt },
    );

    return result.prompts;
  }

  private async generateDirectBrandPrompts(
    brandName: string,
    market: string,
    language: string,
    count: number,
    websiteUrl: string,
  ): Promise<string[]> {
    // Define our schema for the LLM output
    const promptsSchema = z.object({
      prompts: z.array(z.string()),
    });

    // Call LLM with structured output processing
    const result = await this.llmService.getStructuredOutput(
      LlmProvider.OpenAI,
      directUserPrompt({ market, brandName, count, websiteUrl, language }),
      promptsSchema,
      { systemPrompt: directSystemPrompt },
    );

    return result.prompts;
  }

  private async generateComparisonPrompts(
    brandName: string,
    competitors: string[],
    industry: string,
    keyBrandAttributes: string[],
    market: string,
    language: string,
    count: number,
  ): Promise<string[]> {
    // Use default competitors if none provided
    const competitorList =
      competitors && competitors.length > 0 ? competitors : ['competitors in the industry'];

    // Define our schema for the LLM output
    const promptsSchema = z.object({
      prompts: z.array(z.string()),
    });

    // Call LLM with structured output processing
    const result = await this.llmService.getStructuredOutput(
      LlmProvider.OpenAI,
      comparisonUserPrompt({
        market,
        brandName,
        competitors: competitorList,
        industry,
        keyBrandAttributes,
        count,
        language,
      }),
      promptsSchema,
      { systemPrompt: comparisonSystemPrompt },
    );

    return result.prompts;
  }

  /**
   * Generate accuracy evaluation prompts for a brand
   * @param brandName Company brand name
   * @param market Market where the company operates
   * @param count Number of prompts to generate
   * @returns Array of accuracy evaluation prompts
   */
  private async generateAccuracyPrompts(
    brandName: string,
    market: string,
    language: string,
    brandAttributes: string[],
    count: number,
  ): Promise<string[]> {
    // Define our schema for the LLM output
    const promptsSchema = z.object({
      prompts: z.array(z.string()),
    });

    // Call LLM with structured output processing
    const result = await this.llmService.getStructuredOutput(
      LlmProvider.OpenAI,
      accuracyUserPrompt({
        market,
        language,
        brandName,
        brandAttributes,
        count,
      }),
      promptsSchema,
      { systemPrompt: accuracySystemPrompt },
    );

    return result.prompts;
  }

  /**
   * Generate brand battle prompts for competitor-specific comparisons
   * @param brandName Company brand name
   * @param competitors List of competitors
   * @param market Market where the company operates
   * @param count Number of prompts to generate
   * @returns Array of brand battle prompts
   */
  private async generateBrandBattlePrompts(
    brandName: string,
    competitors: string[],
    market: string,
    language: string,
    count: number,
  ): Promise<string[]> {
    // Use default competitors if none provided
    const competitorList =
      competitors && competitors.length > 0 ? competitors : ['competitors in the industry'];

    // Define our schema for the LLM output
    const promptsSchema = z.object({
      prompts: z.array(z.string()),
    });

    // Call LLM with structured output processing
    const result = await this.llmService.getStructuredOutput(
      LlmProvider.OpenAI,
      brandBattleUserPrompt({
        market,
        brandName,
        competitors: competitorList,
        count,
        language,
      }),
      promptsSchema,
      { systemPrompt: brandBattleSystemPrompt },
    );

    return result.prompts;
  }

  /**
   * Create a new prompt set for a project
   * @param projectId - ID of the project
   * @param prompts - Object containing the prompts to save
   * @returns The created prompt set
   */
  async createPromptSet(
    projectId: string,
    prompts: {
      spontaneous?: string[];
      direct?: string[];
      comparison?: string[];
      accuracy?: string[];
      brandBattle?: string[];
    },
  ) {
    this.logger.log(`Creating prompt set for project: ${projectId}`);

    try {
      // Check if a prompt set already exists for this project
      const existingPromptSet = await this.promptSetRepository.findByProjectId(projectId);

      if (existingPromptSet) {
        this.logger.log(`Prompt set already exists for project ${projectId}, updating it instead`);
        return this.updatePromptSet(projectId, prompts);
      }

      // Create new prompt set
      const promptSetData = {
        projectId,
        spontaneous: prompts.spontaneous || [],
        direct: prompts.direct || [],
        comparison: prompts.comparison || [],
        accuracy: prompts.accuracy || [],
        brandBattle: prompts.brandBattle || [],
      };

      const savedPromptSet = await this.promptSetRepository.create(promptSetData);
      this.logger.log(`Prompt set created successfully for project ${projectId}`);

      return savedPromptSet;
    } catch (error) {
      this.logger.error(`Error creating prompt set for project ${projectId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update prompt set for a project
   * @param projectId - ID of the project
   * @param updatedPrompts - Object containing the updated prompts
   * @returns The updated prompt set
   */
  async updatePromptSet(
    projectId: string,
    updatedPrompts: {
      spontaneous?: string[];
      direct?: string[];
      comparison?: string[];
      accuracy?: string[];
      brandBattle?: string[];
    },
  ) {
    this.logger.log(`Updating prompts for project: ${projectId}`);

    try {
      // Check if a prompt set exists for this project
      const existingPromptSet = await this.promptSetRepository.findByProjectId(projectId);

      if (!existingPromptSet) {
        this.logger.error(`No prompt set found for project ${projectId}`);
        throw new NotFoundException(`No prompt set found for project ${projectId}`);
      }

      // Prepare update data
      const updateData: any = {};

      if (updatedPrompts.spontaneous !== undefined) {
        updateData.spontaneous = updatedPrompts.spontaneous;
      }

      if (updatedPrompts.direct !== undefined) {
        updateData.direct = updatedPrompts.direct;
      }

      if (updatedPrompts.comparison !== undefined) {
        updateData.comparison = updatedPrompts.comparison;
      }

      if (updatedPrompts.accuracy !== undefined) {
        updateData.accuracy = updatedPrompts.accuracy;
      }

      if (updatedPrompts.brandBattle !== undefined) {
        updateData.brandBattle = updatedPrompts.brandBattle;
      }

      // Only update if there are changes
      if (Object.keys(updateData).length === 0) {
        return {
          id: existingPromptSet.id,
          projectId: existingPromptSet.projectId,
          spontaneous: existingPromptSet.spontaneous,
          direct: existingPromptSet.direct,
          comparison: existingPromptSet.comparison,
          accuracy: existingPromptSet.accuracy,
          brandBattle: existingPromptSet.brandBattle,
          updatedAt:
            existingPromptSet.updatedAt instanceof Date ? existingPromptSet.updatedAt : new Date(),
          createdAt:
            existingPromptSet.createdAt instanceof Date ? existingPromptSet.createdAt : new Date(),
        };
      }

      // Update the prompt set
      const updatedPromptSet = await this.promptSetRepository.updateByProjectId(
        projectId,
        updateData,
      );

      if (!updatedPromptSet) {
        throw new NotFoundException(
          `Prompt set with project ID ${projectId} not found after update`,
        );
      }

      this.logger.log(`Successfully updated prompts for project ${projectId}`);
      return {
        id: updatedPromptSet.id,
        projectId: updatedPromptSet.projectId,
        spontaneous: updatedPromptSet.spontaneous,
        direct: updatedPromptSet.direct,
        comparison: updatedPromptSet.comparison,
        accuracy: updatedPromptSet.accuracy,
        brandBattle: updatedPromptSet.brandBattle,
        updatedAt:
          updatedPromptSet.updatedAt instanceof Date ? updatedPromptSet.updatedAt : new Date(),
        createdAt:
          updatedPromptSet.createdAt instanceof Date ? updatedPromptSet.createdAt : new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to update prompts: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Regenerate the prompt set for a project
   * @param projectId - ID of the project
   * @returns The regenerated prompt set
   */
  async regeneratePromptSet(projectId: string) {
    this.logger.log(`Regenerating prompts for project: ${projectId}`);

    try {
      // Fetch the project details to create context-specific prompts
      const projectRaw = await this.projectRepository.findById(projectId);

      if (!projectRaw) {
        this.logger.error(`Project ${projectId} not found when regenerating prompts`);
        throw new NotFoundException(`Project ${projectId} not found`);
      }

      // Map raw DB result to Project
      const project: Project = {
        projectId: projectRaw.id,
        brandName: projectRaw.brandName,
        website: projectRaw.website,
        industry: projectRaw.industry,
        shortDescription: projectRaw.shortDescription,
        fullDescription: projectRaw.fullDescription,
        objectives: projectRaw.objectives,
        keyBrandAttributes: projectRaw.keyBrandAttributes,
        competitors: projectRaw.competitors,
        updatedAt: projectRaw.updatedAt instanceof Date ? projectRaw.updatedAt : new Date(),
        organizationId: projectRaw.organizationId,
        market: projectRaw.market,
        language: projectRaw.language,
      };

      // Generate new prompt set
      const promptSet = await this.generatePromptSet(project);

      // Check if a prompt set already exists for this project
      const existingPromptSet = await this.promptSetRepository.findByProjectId(projectId);

      let result;

      if (existingPromptSet) {
        // Update existing prompt set
        result = await this.promptSetRepository.updateByProjectId(projectId, {
          spontaneous: promptSet.spontaneous,
          direct: promptSet.direct,
          comparison: promptSet.comparison,
          accuracy: promptSet.accuracy,
          brandBattle: promptSet.brandBattle,
        });

        if (!result) {
          throw new NotFoundException(
            `Prompt set with project ID ${projectId} not found after update`,
          );
        }
      } else {
        // Create new prompt set
        result = await this.promptSetRepository.create({
          id: projectId,
          projectId: projectId,
          spontaneous: promptSet.spontaneous,
          direct: promptSet.direct,
          comparison: promptSet.comparison,
          accuracy: promptSet.accuracy,
          brandBattle: promptSet.brandBattle,
        });
      }

      this.logger.log(`Successfully regenerated prompts for project ${projectId}`);
      return {
        id: result.id,
        projectId: result.projectId,
        spontaneous: result.spontaneous,
        direct: result.direct,
        comparison: result.comparison,
        accuracy: result.accuracy,
        brandBattle: result.brandBattle,
        updatedAt: result.updatedAt instanceof Date ? result.updatedAt : new Date(),
        createdAt: result.createdAt instanceof Date ? result.createdAt : new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to regenerate prompts: ${error.message}`, error.stack);
      throw error;
    }
  }
}
