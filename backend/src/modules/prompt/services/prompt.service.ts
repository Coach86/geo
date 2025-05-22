import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptSetRepository } from '../repositories/prompt-set.repository';
import { CompanyCreatedEvent } from '../../identity-card/events/company-created.event';
import { LlmService } from '../../llm/services/llm.service';
import { z } from 'zod';
import { spontaneousSystemPrompt, spontaneousUserPrompt } from './spontaneous-prompts';
import { directSystemPrompt, directUserPrompt } from './direct-prompts';
import { comparisonSystemPrompt, comparisonUserPrompt } from './comparison-prompts';
import { accuracySystemPrompt, accuracyUserPrompt } from './accuracy-prompts';
import { brandBattleSystemPrompt, brandBattleUserPrompt } from './brand-battle-prompts';
import { CompanyIdentityCard } from '../../identity-card/entities/company-identity-card.entity';
import { PromptSet, PromptSetDocument } from '../schemas/prompt-set.schema';
import { IdentityCardRepository } from '../../identity-card/repositories/identity-card.repository';
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
    private readonly identityCardRepository: IdentityCardRepository,
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
   * Get a company by ID using the identity card repository
   * @param companyId The ID of the company to get
   * @returns The company identity card or null if not found
   */
  async getCompanyById(companyId: string): Promise<CompanyIdentityCard | null> {
    try {
      const document = await this.identityCardRepository.findById(companyId);
      if (!document) {
        return null;
      }

      // Map the document to the entity format
      return this.identityCardRepository.mapToEntity(document);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  @OnEvent('company.created')
  async handleCompanyCreated(event: CompanyCreatedEvent) {
    this.logger.log(`Generating prompts for new company: ${event.companyId}`);

    try {
      // Check if a prompt set already exists for this company
      const existingPromptSet = await this.promptSetRepository.findByCompanyId(event.companyId);

      if (existingPromptSet) {
        this.logger.log(`Prompt set already exists for company ${event.companyId}`);
        return;
      }

      // Fetch the company details to create context-specific prompts
      const companyRaw = await this.identityCardRepository.findById(event.companyId);

      if (!companyRaw) {
        this.logger.error(`Company ${event.companyId} not found when generating prompts`);
        return;
      }

      // Map raw DB result to CompanyIdentityCard
      const company: CompanyIdentityCard = {
        companyId: companyRaw.id,
        brandName: companyRaw.brandName,
        website: companyRaw.website,
        industry: companyRaw.industry,
        shortDescription: companyRaw.shortDescription,
        fullDescription: companyRaw.fullDescription,
        keyBrandAttributes: companyRaw.keyBrandAttributes,
        competitors: companyRaw.competitors,
        updatedAt: companyRaw.updatedAt instanceof Date ? companyRaw.updatedAt : new Date(),
        userId: companyRaw.userId,
        market: companyRaw.market,
        language: companyRaw.language,
      };

      const promptSet = await this.generatePromptSet(company);

      // Save to database
      await this.promptSetRepository.create({
        id: event.companyId,
        companyId: event.companyId,
        spontaneous: promptSet.spontaneous,
        direct: promptSet.direct,
        comparison: promptSet.comparison,
        accuracy: promptSet.accuracy,
        brandBattle: promptSet.brandBattle,
      });

      this.logger.log(`Successfully generated prompts for company ${event.companyId}`);
    } catch (error) {
      this.logger.error(`Failed to generate prompts: ${error.message}`, error.stack);
    }
  }

  @OnEvent('company.deleted')
  async handleCompanyDeleted(event: { companyId: string }) {
    const { companyId } = event;
    await this.promptSetRepository.deleteByCompanyId(companyId);
    this.logger.log(`Cleaned up prompt sets for deleted company ${companyId}`);
  }

  private async generatePromptSet(company: CompanyIdentityCard) {
    // Parse company info to ensure we have all fields
    const brandName = company.brandName;
    const industry = company.industry;
    const competitors = company.competitors;
    const keyBrandAttributes = company.keyBrandAttributes;
    const websiteUrl = company.website;
    const market = company.market;
    const language = company.language;
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
      this.generateAccuracyPrompts(brandName, market, language, this.accuracyPromptCount),
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
   * Update prompt set for a company
   * @param companyId - ID of the company
   * @param updatedPrompts - Object containing the updated prompts
   * @returns The updated prompt set
   */
  async updatePromptSet(
    companyId: string,
    updatedPrompts: {
      spontaneous?: string[];
      direct?: string[];
      comparison?: string[];
      accuracy?: string[];
      brandBattle?: string[];
    },
  ) {
    this.logger.log(`Updating prompts for company: ${companyId}`);

    try {
      // Check if a prompt set exists for this company
      const existingPromptSet = await this.promptSetRepository.findByCompanyId(companyId);

      if (!existingPromptSet) {
        this.logger.error(`No prompt set found for company ${companyId}`);
        throw new NotFoundException(`No prompt set found for company ${companyId}`);
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
          companyId: existingPromptSet.companyId,
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
      const updatedPromptSet = await this.promptSetRepository.updateByCompanyId(
        companyId,
        updateData,
      );

      if (!updatedPromptSet) {
        throw new NotFoundException(
          `Prompt set with company ID ${companyId} not found after update`,
        );
      }

      this.logger.log(`Successfully updated prompts for company ${companyId}`);
      return {
        id: updatedPromptSet.id,
        companyId: updatedPromptSet.companyId,
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
   * Regenerate the prompt set for a company
   * @param companyId - ID of the company
   * @returns The regenerated prompt set
   */
  async regeneratePromptSet(companyId: string) {
    this.logger.log(`Regenerating prompts for company: ${companyId}`);

    try {
      // Fetch the company details to create context-specific prompts
      const companyRaw = await this.identityCardRepository.findById(companyId);

      if (!companyRaw) {
        this.logger.error(`Company ${companyId} not found when regenerating prompts`);
        throw new NotFoundException(`Company ${companyId} not found`);
      }

      // Map raw DB result to CompanyIdentityCard
      const company: CompanyIdentityCard = {
        companyId: companyRaw.id,
        brandName: companyRaw.brandName,
        website: companyRaw.website,
        industry: companyRaw.industry,
        shortDescription: companyRaw.shortDescription,
        fullDescription: companyRaw.fullDescription,
        keyBrandAttributes: companyRaw.keyBrandAttributes,
        competitors: companyRaw.competitors,
        updatedAt: companyRaw.updatedAt instanceof Date ? companyRaw.updatedAt : new Date(),
        userId: companyRaw.userId,
        market: companyRaw.market,
        language: companyRaw.language,
      };

      // Generate new prompt set
      const promptSet = await this.generatePromptSet(company);

      // Check if a prompt set already exists for this company
      const existingPromptSet = await this.promptSetRepository.findByCompanyId(companyId);

      let result;

      if (existingPromptSet) {
        // Update existing prompt set
        result = await this.promptSetRepository.updateByCompanyId(companyId, {
          spontaneous: promptSet.spontaneous,
          direct: promptSet.direct,
          comparison: promptSet.comparison,
          accuracy: promptSet.accuracy,
          brandBattle: promptSet.brandBattle,
        });

        if (!result) {
          throw new NotFoundException(
            `Prompt set with company ID ${companyId} not found after update`,
          );
        }
      } else {
        // Create new prompt set
        result = await this.promptSetRepository.create({
          id: companyId,
          companyId,
          spontaneous: promptSet.spontaneous,
          direct: promptSet.direct,
          comparison: promptSet.comparison,
          accuracy: promptSet.accuracy,
          brandBattle: promptSet.brandBattle,
        });
      }

      this.logger.log(`Successfully regenerated prompts for company ${companyId}`);
      return {
        id: result.id,
        companyId: result.companyId,
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
