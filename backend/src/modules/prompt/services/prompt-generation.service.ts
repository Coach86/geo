import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { z, ZodSchema } from 'zod';
import { visibilitySystemPrompt, visibilityUserPrompt } from './visibility-prompts';
import { sentimentSystemPrompt, sentimentUserPrompt } from './sentiment-prompts';
import { competitionSystemPrompt, competitionUserPrompt } from './competition-prompts';
import { alignmentSystemPrompt, alignmentUserPrompt } from './alignment-prompts';
import { LlmProvider } from '@/modules/llm/interfaces/llm-provider.enum';

/**
 * Service responsible for generating different types of prompts using LLM.
 * Handles visibility, sentiment, competition, and alignment prompt generation.
 */
@Injectable()
export class PromptGenerationService {
  private readonly logger = new Logger(PromptGenerationService.name);

  constructor(
    private readonly llmService: LlmService,
  ) {}

  /**
   * Helper method to call structured output with fallback providers
   * @param userPrompt The user prompt to send
   * @param schema The zod schema for the expected output
   * @param systemPrompt The system prompt to use
   * @param promptType The type of prompt being generated (for logging)
   * @returns The structured output from the first successful provider
   */
  async getStructuredOutputWithFallback<T>(
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

  async generateVisibilityPrompts(
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

  async generateSentimentPrompts(
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

  async generateCompetitionPrompts(
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
  async generateAlignmentPrompts(
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
}