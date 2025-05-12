import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import {
  CompanyBatchContext,
  SpontaneousPipelineResult,
  SpontaneousResults,
} from '../interfaces/batch.interfaces';
import { AnalyzerConfig, LlmModelConfig } from '../interfaces/llm.interfaces';
import { BasePipelineService } from './base-pipeline.service';
import { SystemPrompts, PromptTemplates, formatPrompt } from '../prompts/prompts';

@Injectable()
export class SpontaneousPipelineService extends BasePipelineService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly llmService: LlmService,
  ) {
    super(configService, llmService, SpontaneousPipelineService.name);
  }

  /**
   * Get analyzer config for this specific pipeline
   */
  protected getAnalyzerConfig(): AnalyzerConfig {
    return this.config.analyzerConfig.spontaneous;
  }

  /**
   * Run the spontaneous pipeline for a company
   * @param context Company batch context
   * @returns Pipeline results
   */
  async run(context: CompanyBatchContext): Promise<SpontaneousResults> {
    this.logger.log(`Running spontaneous pipeline for ${context.companyId} (${context.brandName})`);

    try {
      // Get the prompts for this pipeline
      const promptsJson = context.promptSet?.spontaneous || '[]';
      const prompts: string[] = JSON.parse(promptsJson);

      if (!prompts.length) {
        throw new Error('No spontaneous prompts found for this company');
      }

      // Get the enabled LLM models from configuration
      const enabledModels = this.config.llmModels.filter((model) => model.enabled);

      if (enabledModels.length === 0) {
        throw new Error('No enabled LLM models found in configuration');
      }

      // Create tasks for each model and prompt
      const tasks = [];

      for (const modelConfig of enabledModels) {
        for (let i = 0; i < prompts.length; i++) {
          tasks.push(
            this.limiter(async () => {
              try {
                // Step 1: Execute the prompt with this model
                const llmResponse = await this.executePrompt(modelConfig.id, prompts[i]);

                // Step 2: Analyze the response
                return await this.analyzeResponse(
                  modelConfig,
                  context.brandName,
                  prompts[i],
                  llmResponse,
                  i,
                );
              } catch (error) {
                this.logger.error(
                  `Error in spontaneous pipeline for ${context.brandName} with ${modelConfig.provider}/${modelConfig.model} on prompt ${i}: ${error.message}`,
                  error.stack,
                );
                return {
                  llmProvider: `${modelConfig.provider}/${modelConfig.model}`,
                  promptIndex: i,
                  mentioned: false,
                  topOfMind: [],
                  originalPrompt: prompts[i],
                  error: error.message,
                };
              }
            }),
          );
        }
      }

      // Run all tasks
      const results = await Promise.all(tasks);

      // Analyze and summarize results
      const summary = this.analyzeSpontaneousResults(results);

      this.logger.log(
        `Completed spontaneous pipeline for ${context.companyId} with ${results.length} results`,
      );

      return {
        results,
        summary,
      };
    } catch (error) {
      this.logger.error(
        `Failed to run spontaneous pipeline for ${context.companyId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Analyze the LLM response to determine if the brand was mentioned
   * @param modelConfig The LLM model configuration that generated the response
   * @param brandName The company brand name
   * @param prompt The original prompt
   * @param llmResponse The response from the LLM
   * @param promptIndex The index of the prompt
   * @returns Analysis of the LLM response
   */
  private async analyzeResponse(
    modelConfig: LlmModelConfig,
    brandName: string,
    prompt: string,
    llmResponse: string,
    promptIndex: number,
  ): Promise<SpontaneousPipelineResult> {
    this.logger.log(
      `Analyzing response from ${modelConfig.provider}/${modelConfig.model} for spontaneous mention of ${brandName}`,
    );

    // Define the schema for structured output
    const schema = z.object({
      mentioned: z.boolean().describe('Whether the brand was mentioned without prompting'),
      topOfMind: z.array(z.string()).describe('List of top-of-mind brands or companies mentioned'),
    });

    // Format the user prompt using the template
    const userPrompt = formatPrompt(PromptTemplates.SPONTANEOUS_ANALYSIS, {
      originalPrompt: prompt,
      brandName,
      llmResponse
    });

    try {
      // Use the base class method for structured analysis with fallback
      const result = await this.getStructuredAnalysis(
        userPrompt,
        schema,
        SystemPrompts.SPONTANEOUS_ANALYSIS
      );

      // Check if the brand name is mentioned in the top-of-mind list as a backup
      const normalizedBrandName = brandName.toLowerCase();
      let mentioned = result.mentioned;

      if (!mentioned) {
        mentioned = result.topOfMind.some((brand) =>
          brand.toLowerCase().includes(normalizedBrandName),
        );
      }

      return {
        llmProvider: `${modelConfig.provider}/${modelConfig.model}`,
        promptIndex,
        mentioned,
        topOfMind: result.topOfMind,
        originalPrompt: prompt,
        llmResponse,
      };
    } catch (error) {
      this.logger.error(`All analyzers failed for spontaneous analysis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze and summarize the results of the spontaneous pipeline
   * @param results Array of pipeline results
   * @returns Summary statistics
   */
  private analyzeSpontaneousResults(
    results: SpontaneousPipelineResult[],
  ): SpontaneousResults['summary'] {
    // Filter out results with errors
    const validResults = results.filter((r) => !r.error);

    if (validResults.length === 0) {
      return {
        mentionRate: 0,
        topMentions: [],
      };
    }

    // Calculate mention rate
    const mentionCount = validResults.filter((r) => r.mentioned).length;
    const mentionRate = mentionCount / validResults.length;

    // Count top mentions
    const mentions: Record<string, number> = {};
    for (const result of validResults) {
      for (const brand of result.topOfMind) {
        const normalizedBrand = brand.toLowerCase();
        mentions[normalizedBrand] = (mentions[normalizedBrand] || 0) + 1;
      }
    }

    // Sort by mention count
    const sortedMentions = Object.entries(mentions)
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 10)
      .map(([brand]) => brand);

    return {
      mentionRate,
      topMentions: sortedMentions,
    };
  }
}