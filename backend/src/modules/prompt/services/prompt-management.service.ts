import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PromptSetRepository } from '../repositories/prompt-set.repository';
import { ProjectRepository } from '../../project/repositories/project.repository';
import { Project } from '../../project/entities/project.entity';
import { PromptGenerationService } from './prompt-generation.service';

/**
 * Service responsible for managing prompt sets (CRUD operations).
 * Handles creation, updating, and regeneration of prompt sets.
 */
@Injectable()
export class PromptManagementService {
  private readonly logger = new Logger(PromptManagementService.name);
  private readonly visibilityPromptCount: number = 12;
  private readonly sentimentPromptCount: number = 3;
  private readonly competitionPromptCount: number = 5;
  private readonly alignmentPromptCount: number = 3;

  constructor(
    private readonly promptSetRepository: PromptSetRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly promptGenerationService: PromptGenerationService,
  ) {}

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

  async generatePromptSet(project: Project, additionalInstructions?: string) {
    // Parse company info to ensure we have all fields
    const brandName = project.brandName;
    const industry = project.industry;
    const competitors = project.competitors;
    const keyBrandAttributes = project.keyBrandAttributes;
    const websiteUrl = project.website;
    const market = project.market;
    const language = project.language;
    const scrapedKeywords = project.scrapedKeywords || [];
    // Generate all prompts using LLM
    const [visibility, sentiment, competition, alignment] = await Promise.all([
      this.promptGenerationService.generateVisibilityPrompts(
        websiteUrl,
        industry,
        brandName,
        market,
        language,
        this.visibilityPromptCount,
        competitors,
        scrapedKeywords,
        additionalInstructions,
      ),
      this.promptGenerationService.generateSentimentPrompts(
        brandName,
        market,
        language,
        this.sentimentPromptCount,
        websiteUrl,
      ),
      this.promptGenerationService.generateCompetitionPrompts(
        brandName,
        competitors,
        industry,
        keyBrandAttributes,
        market,
        language,
        this.competitionPromptCount,
      ),
      this.promptGenerationService.generateAlignmentPrompts(
        brandName,
        market,
        language,
        keyBrandAttributes,
        this.alignmentPromptCount,
      ),
      // Brand battle prompts merged into competition
    ]);

    return { visibility, sentiment, competition, alignment };
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
      visibility?: string[];
      sentiment?: string[];
      competition?: string[];
      alignment?: string[];
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
        visibility: prompts.visibility || [],
        sentiment: prompts.sentiment || [],
        competition: prompts.competition || [],
        alignment: prompts.alignment || [],
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
      visibility?: string[];
      sentiment?: string[];
      competition?: string[];
      alignment?: string[];
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

      if (updatedPrompts.visibility !== undefined) {
        updateData.visibility = updatedPrompts.visibility;
      }

      if (updatedPrompts.sentiment !== undefined) {
        updateData.sentiment = updatedPrompts.sentiment;
      }

      if (updatedPrompts.competition !== undefined) {
        updateData.competition = updatedPrompts.competition;
      }

      if (updatedPrompts.alignment !== undefined) {
        updateData.alignment = updatedPrompts.alignment;
      }

      // Only update if there are changes
      if (Object.keys(updateData).length === 0) {
        return {
          id: existingPromptSet.id,
          projectId: existingPromptSet.projectId,
          visibility: existingPromptSet.visibility,
          sentiment: existingPromptSet.sentiment,
          competition: existingPromptSet.competition,
          alignment: existingPromptSet.alignment,
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
        visibility: updatedPromptSet.visibility,
        sentiment: updatedPromptSet.sentiment,
        competition: updatedPromptSet.competition,
        alignment: updatedPromptSet.alignment,
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
   * Regenerate specific prompt type for a project
   * @param projectId - ID of the project
   * @param promptType - Type of prompts to regenerate
   * @param count - Optional number of prompts to generate
   * @param additionalInstructions - Optional additional instructions for generation
   * @param keywords - Optional keywords to incorporate
   * @returns The regenerated prompts
   */
  async regeneratePromptType(
    projectId: string,
    promptType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
    count?: number,
    additionalInstructions?: string,
    keywords?: string[],
    addMode?: boolean,
  ): Promise<string[]> {
    this.logger.log(`Regenerating ${promptType} prompts for project: ${projectId}`);

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

      // Generate prompts for the specific type
      let regeneratedPrompts: string[];
      const promptCount = count || this[`${promptType}PromptCount`];

      switch (promptType) {
        case 'visibility':
          regeneratedPrompts = await this.promptGenerationService.generateVisibilityPrompts(
            project.website,
            project.industry,
            project.brandName,
            project.market,
            project.language,
            promptCount,
            project.competitors,
            keywords || project.scrapedKeywords || [],
            additionalInstructions,
          );
          break;
        case 'sentiment':
          regeneratedPrompts = await this.promptGenerationService.generateSentimentPrompts(
            project.brandName,
            project.market,
            project.language,
            promptCount,
            project.website,
          );
          break;
        case 'alignment':
          regeneratedPrompts = await this.promptGenerationService.generateAlignmentPrompts(
            project.brandName,
            project.market,
            project.language,
            project.keyBrandAttributes,
            promptCount,
          );
          break;
        case 'competition':
          regeneratedPrompts = await this.promptGenerationService.generateCompetitionPrompts(
            project.brandName,
            project.competitors,
            project.industry,
            project.keyBrandAttributes,
            project.market,
            project.language,
            promptCount,
          );
          break;
      }

      // Update only the specific prompt type in the database
      const existingPromptSet = await this.promptSetRepository.findByProjectId(projectId);

      if (existingPromptSet) {
        let updateData: any;

        if (addMode) {
          // In add mode, combine existing prompts with new ones
          const existingPrompts = existingPromptSet[promptType] || [];
          const combinedPrompts = [...existingPrompts, ...regeneratedPrompts];
          updateData = {
            [promptType]: combinedPrompts,
          };
          this.logger.log(`Adding ${regeneratedPrompts.length} ${promptType} prompts to existing ${existingPrompts.length} prompts`);
        } else {
          // In overwrite mode, replace all prompts
          updateData = {
            [promptType]: regeneratedPrompts,
          };
        }

        await this.promptSetRepository.updateByProjectId(projectId, updateData);
      } else {
        // Create new prompt set with only the regenerated type
        await this.promptSetRepository.create({
          id: projectId,
          projectId: projectId,
          visibility: promptType === 'visibility' ? regeneratedPrompts : [],
          sentiment: promptType === 'sentiment' ? regeneratedPrompts : [],
          competition: promptType === 'competition' ? regeneratedPrompts : [],
          alignment: promptType === 'alignment' ? regeneratedPrompts : [],
        });
      }

      this.logger.log(`Successfully regenerated ${regeneratedPrompts.length} ${promptType} prompts for project ${projectId}`);
      return regeneratedPrompts;
    } catch (error) {
      this.logger.error(`Failed to regenerate ${promptType} prompts: ${error.message}`, error.stack);
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
          visibility: promptSet.visibility,
          sentiment: promptSet.sentiment,
          competition: promptSet.competition,
          alignment: promptSet.alignment,
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
          visibility: promptSet.visibility,
          sentiment: promptSet.sentiment,
          competition: promptSet.competition,
          alignment: promptSet.alignment,
        });
      }

      this.logger.log(`Successfully regenerated prompts for project ${projectId}`);
      return {
        id: result.id,
        projectId: result.projectId,
        visibility: result.visibility,
        sentiment: result.sentiment,
        competition: result.competition,
        alignment: result.alignment,
        updatedAt: result.updatedAt instanceof Date ? result.updatedAt : new Date(),
        createdAt: result.createdAt instanceof Date ? result.createdAt : new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to regenerate prompts: ${error.message}`, error.stack);
      throw error;
    }
  }
}