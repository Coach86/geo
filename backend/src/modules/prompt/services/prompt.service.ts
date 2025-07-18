import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PromptSetRepository } from '../repositories/prompt-set.repository';
import { ProjectCreatedEvent } from '../../project/events/project-created.event';
import { Project } from '../../project/entities/project.entity';
import { ProjectRepository } from '../../project/repositories/project.repository';
import { PromptGenerationService } from './prompt-generation.service';
import { PromptManagementService } from './prompt-management.service';
import { PromptKeywordsService } from './prompt-keywords.service';

/**
 * Main prompt service that coordinates prompt generation and management.
 * Delegates to specialized services for different concerns.
 */
@Injectable()
export class PromptService implements OnModuleInit {
  private readonly logger = new Logger(PromptService.name);
  private visibilityPromptCount: number;
  private sentimentPromptCount: number;
  private competitionPromptCount: number;
  private alignmentPromptCount: number;

  constructor(
    private readonly promptSetRepository: PromptSetRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly configService: ConfigService,
    private readonly promptGenerationService: PromptGenerationService,
    private readonly promptManagementService: PromptManagementService,
    private readonly promptKeywordsService: PromptKeywordsService,
  ) {}

  onModuleInit() {
    // Load prompt counts from configuration
    this.visibilityPromptCount = this.configService.get<number>('VISIBILITY_PROMPTS', 12);
    this.sentimentPromptCount = this.configService.get<number>('SENTIMENT_PROMPTS', 3);
    this.competitionPromptCount = this.configService.get<number>('COMPETITION_PROMPTS', 5);
    this.alignmentPromptCount = this.configService.get<number>('ALIGNMENT_PROMPTS', 3);

    this.logger.log(
      `Initialized with ${this.visibilityPromptCount} visibility prompts, ${this.sentimentPromptCount} sentiment prompts, ` +
        `${this.competitionPromptCount} competition prompts, ${this.alignmentPromptCount} alignment prompts`,
    );
  }


  /**
   * Get a project by ID - delegates to management service
   */
  async getProjectById(projectId: string): Promise<Project | null> {
    return this.promptManagementService.getProjectById(projectId);
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

      const promptSet = await this.promptManagementService.generatePromptSet(project);

      // Save to database
      await this.promptSetRepository.create({
        id: event.projectId,
        projectId: event.projectId,
        visibility: promptSet.visibility,
        sentiment: promptSet.sentiment,
        competition: promptSet.competition,
        alignment: promptSet.alignment,
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

  async generatePromptSet(project: Project, additionalInstructions?: string) {
    return this.promptManagementService.generatePromptSet(project, additionalInstructions);
  }


  /**
   * Create a new prompt set for a project - delegates to management service
   */
  async createPromptSet(
    projectId: string,
    prompts: {
      visibility?: string[];
      sentiment?: string[];
      competition?: string[];
      alignment?: string[];
    },
  ) {
    return this.promptManagementService.createPromptSet(projectId, prompts);
  }

  /**
   * Update prompt set for a project - delegates to management service
   */
  async updatePromptSet(
    projectId: string,
    updatedPrompts: {
      visibility?: string[];
      sentiment?: string[];
      competition?: string[];
      alignment?: string[];
    },
  ) {
    return this.promptManagementService.updatePromptSet(projectId, updatedPrompts);
  }

  /**
   * Regenerate specific prompt type for a project - delegates to management service
   */
  async regeneratePromptType(
    projectId: string,
    promptType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
    count?: number,
    additionalInstructions?: string,
    keywords?: string[],
    addMode?: boolean,
  ): Promise<string[]> {
    return this.promptManagementService.regeneratePromptType(
      projectId,
      promptType,
      count,
      additionalInstructions,
      keywords,
      addMode,
    );
  }

  /**
   * Regenerate the prompt set for a project - delegates to management service
   */
  async regeneratePromptSet(projectId: string) {
    return this.promptManagementService.regeneratePromptSet(projectId);
  }

  /**
   * Generate prompts from keywords for a specific prompt type - delegates to keywords service
   */
  async generatePromptsFromKeywords(
    projectId: string,
    promptType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
    keywords: string[],
    additionalInstructions?: string,
    count?: number,
    addMode?: boolean,
  ): Promise<string[]> {
    return this.promptKeywordsService.generatePromptsFromKeywords(
      projectId,
      promptType,
      keywords,
      additionalInstructions,
      count,
      addMode,
    );
  }

  /**
   * Generate prompts from keywords without requiring a project - delegates to keywords service
   */
  async generatePromptsFromKeywordsWithoutProject(
    promptType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
    keywords: string[],
    additionalInstructions?: string,
    count?: number,
    projectContext?: {
      brandName?: string;
      website?: string;
      industry?: string;
      market?: string;
      language?: string;
      keyBrandAttributes?: string[];
      competitors?: string[];
      shortDescription?: string;
    },
  ): Promise<string[]> {
    return this.promptKeywordsService.generatePromptsFromKeywordsWithoutProject(
      promptType,
      keywords,
      additionalInstructions,
      count,
      projectContext,
    );
  }
}
