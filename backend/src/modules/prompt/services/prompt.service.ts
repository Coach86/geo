import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptSetRepository } from '../repositories/prompt-set.repository';
import { ProjectCreatedEvent } from '../../project/events/project-created.event';
import { LlmService } from '../../llm/services/llm.service';
import { z, ZodSchema } from 'zod';
import { visibilitySystemPrompt, visibilityUserPrompt } from './visibility-prompts';
import { sentimentSystemPrompt, sentimentUserPrompt } from './sentiment-prompts';
import { competitionSystemPrompt, competitionUserPrompt } from './competition-prompts';
import { alignmentSystemPrompt, alignmentUserPrompt } from './alignment-prompts';
import { Project } from '../../project/entities/project.entity';
import { PromptSet, PromptSetDocument } from '../schemas/prompt-set.schema';
import { ProjectRepository } from '../../project/repositories/project.repository';
import { LlmProvider } from '@/modules/llm/interfaces/llm-provider.enum';

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
    private readonly llmService: LlmService,
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
   * Helper method to call structured output with fallback providers
   * @param userPrompt The user prompt to send
   * @param schema The zod schema for the expected output
   * @param systemPrompt The system prompt to use
   * @param promptType The type of prompt being generated (for logging)
   * @returns The structured output from the first successful provider
   */
  private async getStructuredOutputWithFallback<T>(
    userPrompt: string,
    schema: ZodSchema<T>,
    systemPrompt: string,
    promptType: string,
  ): Promise<T> {
    // Log the complete prompt being sent to the LLM
    this.logger.log(`\n========== COMPLETE PROMPT FOR ${promptType.toUpperCase()} ==========`);
    this.logger.log(`SYSTEM PROMPT:\n${systemPrompt}`);
    this.logger.log(`\nUSER PROMPT:\n${userPrompt}`);
    this.logger.log(`========== END OF PROMPT ==========\n`);
    
    // Try providers in order: OpenAI -> Anthropic -> Perplexity
    const providers = [LlmProvider.OpenAI, LlmProvider.Anthropic, LlmProvider.Perplexity];
    
    for (const provider of providers) {
      try {
        this.logger.log(`Attempting to generate ${promptType} prompts using ${provider}`);
        const result = await this.llmService.getStructuredOutput(
          provider,
          userPrompt,
          schema,
          { systemPrompt },
        );
        this.logger.log(`Successfully generated ${promptType} prompts using ${provider}`);
        return result;
      } catch (error) {
        // Check if it's a quota error for clearer logging
        const isQuotaError = error.message?.toLowerCase().includes('exceeded your current quota') || 
                            error.message?.toLowerCase().includes('billing');
        
        if (isQuotaError) {
          this.logger.warn(`${provider} has quota/billing issue: ${error.message}. Trying fallback provider...`);
        } else {
          this.logger.warn(`Failed to generate ${promptType} prompts with ${provider}: ${error.message}`);
        }
        
        // If this is the last provider, throw the error
        if (provider === providers[providers.length - 1]) {
          throw new Error(`Failed to generate prompts with all providers. Last error: ${error.message}`);
        }
        
        // Otherwise, continue to next provider
        const nextProvider = providers[providers.indexOf(provider) + 1];
        this.logger.log(`Falling back to ${nextProvider}...`);
      }
    }

    // This should never be reached due to the throw above, but TypeScript needs it
    throw new Error('Failed to generate prompts with all available providers');
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
      this.generateVisibilityPrompts(
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
      this.generateSentimentPrompts(
        brandName,
        market,
        language,
        this.sentimentPromptCount,
        websiteUrl,
      ),
      this.generateCompetitionPrompts(
        brandName,
        competitors,
        industry,
        keyBrandAttributes,
        market,
        language,
        this.competitionPromptCount,
      ),
      this.generateAlignmentPrompts(
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

  private async generateVisibilityPrompts(
    websiteUrl: string,
    industry: string,
    brandName: string,
    market: string,
    language: string,
    count: number,
    competitors: string[],
    keywords: string[] = [],
    additionalInstructions?: string,
  ): Promise<string[]> {
    // Define our schema for the LLM output
    const promptsSchema = z.object({
      prompts: z.array(z.string()),
    });

    const userPrompt = visibilityUserPrompt({
      market,
      websiteUrl,
      industry,
      brandName,
      count,
      competitors,
      language,
      keywords,
      additionalInstructions,
    });
    
    // Log generation details
    if (additionalInstructions || keywords.length > 0) {
      this.logger.log(`\n========== AI GENERATION WITH ENHANCEMENTS ==========`);
      this.logger.log(`Brand: ${brandName}`);
      this.logger.log(`Prompt Type: visibility`);
      if (keywords.length > 0) {
        this.logger.log(`Keywords: ${keywords.join(', ')}`);
      }
      if (additionalInstructions) {
        this.logger.log(`Additional Instructions: ${additionalInstructions}`);
      }
      this.logger.log(`========== END OF ENHANCEMENTS ==========\n`);
    }

    const result = await this.getStructuredOutputWithFallback<{ prompts: string[] }>(
      userPrompt,
      promptsSchema,
      visibilitySystemPrompt,
      'visibility',
    );

    return result.prompts;
  }

  private async generateSentimentPrompts(
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

    const userPrompt = sentimentUserPrompt({ market, brandName, count, websiteUrl, language });

    const result = await this.getStructuredOutputWithFallback<{ prompts: string[] }>(
      userPrompt,
      promptsSchema,
      sentimentSystemPrompt,
      'sentiment',
    );

    return result.prompts;
  }

  private async generateCompetitionPrompts(
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

    const userPrompt = competitionUserPrompt({
      market,
      brandName,
      competitors: competitorList,
      industry,
      keyBrandAttributes,
      count,
      language,
    });

    const result = await this.getStructuredOutputWithFallback<{ prompts: string[] }>(
      userPrompt,
      promptsSchema,
      competitionSystemPrompt,
      'competition',
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
  private async generateAlignmentPrompts(
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

    const userPrompt = alignmentUserPrompt({
      market,
      language,
      brandName,
      brandAttributes,
      count,
    });

    const result = await this.getStructuredOutputWithFallback<{ prompts: string[] }>(
      userPrompt,
      promptsSchema,
      alignmentSystemPrompt,
      'alignment',
    );

    return result.prompts;
  }

  // Brand battle method removed - merged into competition prompts

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
          regeneratedPrompts = await this.generateVisibilityPrompts(
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
          regeneratedPrompts = await this.generateSentimentPrompts(
            project.brandName,
            project.market,
            project.language,
            promptCount,
            project.website,
          );
          break;
        case 'alignment':
          regeneratedPrompts = await this.generateAlignmentPrompts(
            project.brandName,
            project.market,
            project.language,
            project.keyBrandAttributes,
            promptCount,
          );
          break;
        case 'competition':
          regeneratedPrompts = await this.generateCompetitionPrompts(
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
        const updateData = {
          [promptType]: regeneratedPrompts,
        };

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

      const result = await this.getStructuredOutputWithFallback<{ prompts: string[] }>(
        userPrompt,
        promptsSchema,
        systemPrompt,
        `${promptType} (keyword-based)`,
      );

      // Update the prompt set with the new prompts
      const existingPromptSet = await this.promptSetRepository.findByProjectId(projectId);

      if (existingPromptSet) {
        const updateData = {
          [promptType]: result.prompts,
        };
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

      const result = await this.getStructuredOutputWithFallback<{ prompts: string[] }>(
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
