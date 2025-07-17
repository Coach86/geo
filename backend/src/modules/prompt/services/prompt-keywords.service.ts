import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { PromptSetRepository } from '../repositories/prompt-set.repository';
import { ProjectRepository } from '../../project/repositories/project.repository';
import { Project } from '../../project/entities/project.entity';
import { PromptGenerationService } from './prompt-generation.service';
import { visibilitySystemPrompt, visibilityUserPrompt } from './visibility-prompts';
import { sentimentSystemPrompt, sentimentUserPrompt } from './sentiment-prompts';
import { competitionSystemPrompt, competitionUserPrompt } from './competition-prompts';
import { alignmentSystemPrompt, alignmentUserPrompt } from './alignment-prompts';

/**
 * Service responsible for keyword-based prompt generation.
 * Handles generation of prompts based on provided keywords with or without project context.
 */
@Injectable()
export class PromptKeywordsService {
  private readonly logger = new Logger(PromptKeywordsService.name);
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
   * Generate prompts from keywords for a specific prompt type
   * @param projectId - ID of the project
   * @param promptType - Type of prompts to generate
   * @param keywords - Keywords to base the prompts on
   * @param additionalInstructions - Optional additional instructions
   * @param count - Number of prompts to generate
   * @returns Generated prompts
   */
  async generatePromptsFromKeywords(
    projectId: string,
    promptType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
    keywords: string[],
    additionalInstructions?: string,
    count?: number,
    addMode?: boolean,
  ): Promise<string[]> {
    this.logger.log(`Generating ${promptType} prompts from keywords for project: ${projectId}`);

    try {
      // Fetch the project details
      const projectRaw = await this.projectRepository.findById(projectId);

      if (!projectRaw) {
        this.logger.error(`Project ${projectId} not found when generating prompts from keywords`);
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

      // Log the keyword-based prompt details
      this.logger.log(`\n========== KEYWORD-BASED GENERATION DETAILS ==========`);
      this.logger.log(`Project: ${project.brandName} (${project.projectId})`);
      this.logger.log(`Prompt Type: ${promptType}`);
      this.logger.log(`Keywords: ${keywords.join(', ')}`);
      this.logger.log(`Count: ${count || this[`${promptType}PromptCount`]}`);
      if (additionalInstructions) {
        this.logger.log(`Additional Instructions: ${additionalInstructions}`);
      }
      this.logger.log(`========== END OF DETAILS ==========\n`);

      // Define schema for LLM output
      const promptsSchema = z.object({
        prompts: z.array(z.string()),
      });

      // Get the appropriate system and user prompts
      let systemPrompt: string;
      let userPrompt: string;
      const promptCount = count || this[`${promptType}PromptCount`];

      switch (promptType) {
        case 'visibility':
          systemPrompt = visibilitySystemPrompt;
          userPrompt = visibilityUserPrompt({
            market: project.market,
            language: project.language,
            websiteUrl: project.website,
            industry: project.industry,
            brandName: project.brandName,
            count: promptCount,
            competitors: project.competitors,
            keywords: keywords,
            additionalInstructions: additionalInstructions,
          });
          break;
        case 'sentiment':
          systemPrompt = sentimentSystemPrompt;
          userPrompt = sentimentUserPrompt({
            market: project.market,
            brandName: project.brandName,
            count: promptCount,
            websiteUrl: project.website,
            language: project.language,
          });
          break;
        case 'alignment':
          systemPrompt = alignmentSystemPrompt;
          userPrompt = alignmentUserPrompt({
            market: project.market,
            language: project.language,
            brandName: project.brandName,
            brandAttributes: project.keyBrandAttributes,
            count: promptCount,
          });
          break;
        case 'competition':
          systemPrompt = competitionSystemPrompt;
          userPrompt = competitionUserPrompt({
            market: project.market,
            language: project.language,
            industry: project.industry,
            brandName: project.brandName,
            count: promptCount,
            competitors: project.competitors,
            keyBrandAttributes: project.keyBrandAttributes,
          });
          break;
      }

      const result = await this.promptGenerationService.getStructuredOutputWithFallback<{ prompts: string[] }>(
        userPrompt,
        promptsSchema,
        systemPrompt,
        `${promptType} (keyword-based)`,
      );

      // Update the prompt set with the new prompts
      const existingPromptSet = await this.promptSetRepository.findByProjectId(projectId);

      if (existingPromptSet) {
        let updateData: any;

        if (addMode) {
          // In add mode, combine existing prompts with new ones
          const existingPrompts = existingPromptSet[promptType] || [];
          const combinedPrompts = [...existingPrompts, ...result.prompts];
          updateData = {
            [promptType]: combinedPrompts,
          };
          this.logger.log(`Adding ${result.prompts.length} ${promptType} prompts to existing ${existingPrompts.length} prompts`);
        } else {
          // In overwrite mode, replace all prompts
          updateData = {
            [promptType]: result.prompts,
          };
        }

        await this.promptSetRepository.updateByProjectId(projectId, updateData);
      } else {
        // Create new prompt set with only the generated type
        await this.promptSetRepository.create({
          id: projectId,
          projectId: projectId,
          visibility: promptType === 'visibility' ? result.prompts : [],
          sentiment: promptType === 'sentiment' ? result.prompts : [],
          competition: promptType === 'competition' ? result.prompts : [],
          alignment: promptType === 'alignment' ? result.prompts : [],
        });
      }

      this.logger.log(`Successfully generated ${result.prompts.length} ${promptType} prompts from keywords for project ${projectId}`);
      return result.prompts;
    } catch (error) {
      this.logger.error(`Failed to generate prompts from keywords: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate prompts from keywords without requiring a project
   * This is used when creating new projects
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
    this.logger.log(`Generating ${promptType} prompts from keywords (no project context)`);

    try {
      // Log the keyword-based prompt details
      this.logger.log(`\n========== KEYWORD-BASED GENERATION DETAILS (NO PROJECT) ==========`);
      this.logger.log(`Prompt Type: ${promptType}`);
      this.logger.log(`Keywords: ${keywords.join(', ')}`);
      this.logger.log(`Count: ${count || this[`${promptType}PromptCount`]}`);
      if (additionalInstructions) {
        this.logger.log(`Additional Instructions: ${additionalInstructions}`);
      }
      this.logger.log(`========== END OF DETAILS ==========\n`);

      // Define schema for LLM output
      const promptsSchema = z.object({
        prompts: z.array(z.string()),
      });

      // Get the appropriate system and user prompts
      let systemPrompt: string;
      let userPrompt: string;
      const promptCount = count || this[`${promptType}PromptCount`];

      // Use project context if provided, otherwise use defaults
      const projectParams = {
        market: projectContext?.market || 'Global',
        language: projectContext?.language || 'English',
        websiteUrl: projectContext?.website || 'example.com',
        industry: projectContext?.industry || 'General',
        brandName: projectContext?.brandName || 'Brand',
        count: promptCount,
        competitors: projectContext?.competitors || ['Competitor 1', 'Competitor 2', 'Competitor 3'],
        keyBrandAttributes: projectContext?.keyBrandAttributes || ['Quality', 'Innovation', 'Service'],
        brandDescription: projectContext?.shortDescription || 'A leading company in its industry',
      };

      switch (promptType) {
        case 'visibility':
          systemPrompt = visibilitySystemPrompt;
          userPrompt = visibilityUserPrompt({
            ...projectParams,
            keywords: keywords,
            additionalInstructions: additionalInstructions,
          });
          break;
        case 'sentiment':
          systemPrompt = sentimentSystemPrompt;
          userPrompt = sentimentUserPrompt(projectParams);
          break;
        case 'alignment':
          systemPrompt = alignmentSystemPrompt;
          userPrompt = alignmentUserPrompt({
            market: projectParams.market,
            language: projectParams.language,
            brandName: projectParams.brandName,
            brandAttributes: projectParams.keyBrandAttributes,
            count: projectParams.count,
          });
          break;
        case 'competition':
          systemPrompt = competitionSystemPrompt;
          userPrompt = competitionUserPrompt({
            ...projectParams,
            keyBrandAttributes: projectParams.keyBrandAttributes,
          });
          break;
      }

      const result = await this.promptGenerationService.getStructuredOutputWithFallback<{ prompts: string[] }>(
        userPrompt,
        promptsSchema,
        systemPrompt,
        `${promptType} (keyword-based, no project)`,
      );

      this.logger.log(`Successfully generated ${result.prompts.length} ${promptType} prompts from keywords (no project)`);
      return result.prompts;
    } catch (error) {
      this.logger.error(`Failed to generate prompts from keywords: ${error.message}`, error.stack);
      throw error;
    }
  }
}