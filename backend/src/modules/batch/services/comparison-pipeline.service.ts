import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import { RawResponseService } from './raw-response.service';
import {
  BrandBattleAnalysis,
  BrandBattlePipelineResult,
  CompanyBatchContext,
  ComparisonResults,
  WebSearchSummary,
} from '../interfaces/batch.interfaces';
import {
  AnalyzerConfig,
  LlmModelConfig,
  PipelineType,
  PromptType,
} from '../interfaces/llm.interfaces';
import { BasePipelineService } from './base-pipeline.service';
import { SystemPrompts, PromptTemplates, formatPrompt } from '../prompts/prompts';

@Injectable()
export class ComparisonPipelineService extends BasePipelineService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly llmService: LlmService,
    protected readonly rawResponseService?: RawResponseService,
  ) {
    super(
      configService,
      llmService,
      ComparisonPipelineService.name,
      PipelineType.COMPARISON,
      rawResponseService,
    );
  }

  /**
   * Get analyzer config for this specific pipeline
   */
  protected getAnalyzerConfig(): AnalyzerConfig {
    return this.config.analyzerConfig.comparison;
  }

  /**
   * Run the comparison pipeline for a company
   * @param context Company batch context
   * @returns Comparison results with brand battle data
   */
  async run(context: CompanyBatchContext): Promise<ComparisonResults> {
    this.logger.log(
      `Running brand battle pipeline for ${context.companyId} (${context.brandName})`,
    );

    try {
      // Get comparison prompts
      const comparisonPrompts = context.promptSet?.brandBattle || [];

      if (!comparisonPrompts.length) {
        throw new Error('No comparison prompts found for this company');
      }

      // Get competitors, default to empty array if not provided
      const competitors = context.competitors || [];

      if (competitors.length === 0) {
        this.logger.error(
          `No competitors specified for ${context.companyId}. Brand battle requires competitors.`,
        );
        throw new Error('Brand battle requires competitors to be specified');
      }

      const comparisonResults = await this.runComparison(context, comparisonPrompts, competitors);

      this.logger.log(
        `Completed comparison pipeline for ${context.companyId} with ${comparisonResults.results.length} results`,
      );

      return comparisonResults;
    } catch (error) {
      this.logger.error(
        `Failed to run brand battle pipeline for ${context.companyId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a summary of web search usage in the results
   * @param results Array of comparison pipeline results
   * @returns Web search summary
   */
  private createWebSearchSummary(
    results: Array<{
      usedWebSearch?: boolean;
      citations?: unknown[];
      toolUsage?: unknown[];
      error?: string;
    }>,
  ): WebSearchSummary {
    // Filter out results with errors
    const validResults = results.filter((r) => !r.error);

    if (validResults.length === 0) {
      return {
        usedWebSearch: false,
        webSearchCount: 0,
        consultedWebsites: [],
      };
    }

    // Check which results used web search
    const webSearchResults = validResults.filter((r) => r.usedWebSearch);
    const webSearchCount = webSearchResults.length;
    const usedWebSearch = webSearchCount > 0;

    // Collect unique websites consulted from citations and tool usage
    const websites = new Set<string>();

    for (const result of webSearchResults) {
      // Check citations
      if (result.citations && result.citations.length > 0) {
        for (const citationUnknown of result.citations) {
          const citation = citationUnknown as { url?: string };
          if (citation.url) {
            // Extract the domain from the URL
            try {
              const url = new URL(citation.url);
              websites.add(url.hostname);
            } catch (e) {
              // If URL parsing fails, just use the raw URL
              websites.add(citation.url);
            }
          }
        }
      }

      // Check tool usage
      if (result.toolUsage && result.toolUsage.length > 0) {
        for (const toolUnknown of result.toolUsage) {
          const tool = toolUnknown as { execution_details?: { urls?: string[] } };
          // Check if there are execution details with URLs
          if (tool.execution_details?.urls && Array.isArray(tool.execution_details.urls)) {
            for (const url of tool.execution_details.urls) {
              try {
                const parsedUrl = new URL(url);
                websites.add(parsedUrl.hostname);
              } catch (e) {
                websites.add(url);
              }
            }
          }
        }
      }
    }

    return {
      usedWebSearch,
      webSearchCount,
      consultedWebsites: Array.from(websites),
    };
  }

  /**
   * Run the comparison pipeline for a company against each competitor
   * @param context Company batch context
   * @param prompts Array of brand battle prompts
   * @param competitors Array of competitor names
   * @returns Comparison results with brand battle data
   */
  private async runComparison(
    context: CompanyBatchContext,
    prompts: string[],
    competitors: string[],
  ): Promise<ComparisonResults> {
    this.logger.log(
      `Running comparison for ${context.companyId} against ${competitors.length} competitors`,
    );

    // Get the enabled LLM models
    const enabledModels = this.getEnabledModels();

    if (enabledModels.length === 0) {
      throw new Error('No enabled LLM models found in configuration');
    }

    // Create tasks for each model, prompt, and competitor
    const tasks = [];

    for (const modelConfig of enabledModels) {
      for (let promptIndex = 0; promptIndex < prompts.length; promptIndex++) {
        for (const competitor of competitors) {
          const formattedPrompt = prompts[promptIndex]
            .replace(/{COMPANY}/g, context.brandName)
            .replace(/{COMPETITOR}/g, competitor).concat(`
              <context>${context.brandName}'s URL: ${context.websiteUrl}</context>
              `);

          tasks.push(
            this.limiter(async () => {
              try {
                // Execute the prompt with this model
                const llmResponse = await this.executePrompt(
                  modelConfig,
                  formattedPrompt,
                  context.batchExecutionId,
                  promptIndex,
                );

                // Analyze the response
                return await this.analyzeComparisonResponse(
                  modelConfig,
                  context.brandName,
                  competitor,
                  formattedPrompt,
                  llmResponse,
                  promptIndex,
                );
              } catch (error) {
                this.logger.error(
                  `Error in brand battle for ${context.brandName} vs ${competitor} with ${modelConfig.provider}/${modelConfig.model} on prompt ${promptIndex}: ${error.message}`,
                  error.stack,
                );
                return {
                  llmProvider: modelConfig.provider,
                  llmModel: modelConfig.model,
                  promptIndex,
                  competitor,
                  brandStrengths: [],
                  brandWeaknesses: [],
                  originalPrompt: formattedPrompt,
                  error: error.message,
                };
              }
            }),
          );
        }
      }
    }

    // Run all tasks
    const results = await Promise.all(tasks);

    // Analyze and summarize comparison results
    const competitorAnalyses = this.analyzeComparisonResults(
      context.brandName,
      competitors,
      results,
    );

    // Find common strengths and weaknesses across all competitors
    const commonStrengths = this.findCommonItems(results.map((r) => r.brandStrengths || []));
    const commonWeaknesses = this.findCommonItems(results.map((r) => r.brandWeaknesses || []));

    // Generate web search summary
    const webSearchSummary = this.createWebSearchSummary(results);

    return {
      results,
      summary: {
        competitorAnalyses,
        commonStrengths,
        commonWeaknesses,
      },
      webSearchSummary,
    };
  }

  /**
   * Analyze the LLM response for comparison to extract strengths and weaknesses
   * @param modelConfig The LLM model configuration
   * @param brandName The company brand name
   * @param competitor The competitor name
   * @param prompt The original prompt
   * @param llmResponseObj The response from the LLM
   * @param promptIndex The index of the prompt
   * @returns Analysis of the LLM response for comparison
   */
  private async analyzeComparisonResponse(
    modelConfig: LlmModelConfig,
    brandName: string,
    competitor: string,
    prompt: string,
    llmResponseObj:
      | {
          text?: string;
          metadata?: { usedWebSearch?: boolean; annotations?: unknown[]; toolUsage?: unknown[] };
          batchExecutionId?: string;
        }
      | string,
    promptIndex: number,
  ): Promise<{
    llmProvider: string;
    llmModel: string;
    promptIndex: number;
    competitor: string;
    brandStrengths: string[];
    brandWeaknesses: string[];
    originalPrompt: string;
    llmResponse: string;
    usedWebSearch?: boolean;
    citations?: unknown[];
    toolUsage?: unknown[];
    error?: string;
  }> {
    this.logger.log(
      `Analyzing comparison response from ${modelConfig.provider}/${modelConfig.model} for ${brandName} vs ${competitor}`,
    );

    // Extract the text from the response object
    const llmResponse =
      typeof llmResponseObj === 'string'
        ? llmResponseObj
        : llmResponseObj.text || JSON.stringify(llmResponseObj);

    // Extract metadata if available
    const metadata = typeof llmResponseObj === 'string' ? {} : llmResponseObj.metadata || {};

    // Define the schema for structured output
    const schema = z.object({
      brandStrengths: z
        .array(z.string())
        .describe(`Strengths of ${brandName} compared to ${competitor}`),
      brandWeaknesses: z
        .array(z.string())
        .describe(`Weaknesses of ${brandName} compared to ${competitor}`),
    });

    // Format the user prompt using the template
    const userPrompt = formatPrompt(PromptTemplates.BRAND_BATTLE_ANALYSIS, {
      originalPrompt: prompt,
      brandName,
      competitor,
      llmResponse,
    });

    try {
      // Use the base class method for structured analysis with fallback
      // Pass competitor information to make raw responses unique per competitor
      const result = await this.getStructuredAnalysis(
        userPrompt,
        schema,
        SystemPrompts.COMPARISON_ANALYSIS,
        typeof llmResponseObj === 'string' ? undefined : llmResponseObj.batchExecutionId,
        promptIndex,
        PromptType.COMPARISON,
        prompt,
        llmResponse,
        modelConfig.model,
        // Add competitor as part of the model identifier to ensure uniqueness per competitor
        `${modelConfig.model}_${competitor}`,
      );

      return {
        llmProvider: modelConfig.provider,
        llmModel: modelConfig.model,
        promptIndex,
        competitor,
        brandStrengths: result.brandStrengths,
        brandWeaknesses: result.brandWeaknesses,
        originalPrompt: prompt,
        llmResponse,
        // Include web search and citation information if available
        usedWebSearch: metadata.usedWebSearch || false,
        citations: metadata.annotations || ([] as unknown[]),
        toolUsage: metadata.toolUsage || ([] as unknown[]),
      };
    } catch (error) {
      this.logger.error(`All analyzers failed for comparison analysis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze and summarize comparison results
   * @param brandName The company's brand name
   * @param competitors List of competitor names
   * @param results Array of comparison pipeline results
   * @returns Array of competitor analyses
   */
  private analyzeComparisonResults(
    brandName: string,
    competitors: string[],
    results: Array<{
      competitor: string;
      brandStrengths: string[];
      brandWeaknesses: string[];
      error?: string;
    }>,
  ): BrandBattleAnalysis[] {
    // Create a competitor analysis for each competitor
    return competitors.map((competitor) => {
      // Filter results for this specific competitor and exclude errors
      const competitorResults = results.filter((r) => r.competitor === competitor && !r.error);

      if (competitorResults.length === 0) {
        return {
          competitor,
          brandStrengths: [],
          brandWeaknesses: [],
        };
      }

      // Collect all strengths and weaknesses across results for this competitor
      const allStrengths: string[] = [];
      const allWeaknesses: string[] = [];

      for (const result of competitorResults) {
        if (result.brandStrengths) {
          allStrengths.push(...result.brandStrengths);
        }
        if (result.brandWeaknesses) {
          allWeaknesses.push(...result.brandWeaknesses);
        }
      }

      // Count occurrences of each strength and weakness
      const strengthCounts: Record<string, number> = {};
      const weaknessCounts: Record<string, number> = {};

      for (const strength of allStrengths) {
        const normalized = strength.toLowerCase();
        strengthCounts[normalized] = (strengthCounts[normalized] || 0) + 1;
      }

      for (const weakness of allWeaknesses) {
        const normalized = weakness.toLowerCase();
        weaknessCounts[normalized] = (weaknessCounts[normalized] || 0) + 1;
      }

      // Sort by count and take top strengths and weaknesses
      const topStrengths = Object.entries(strengthCounts)
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
        .slice(0, 10)
        .map(([strength]) => strength);

      const topWeaknesses = Object.entries(weaknessCounts)
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
        .slice(0, 10)
        .map(([weakness]) => weakness);

      return {
        competitor,
        brandStrengths: topStrengths,
        brandWeaknesses: topWeaknesses,
      };
    });
  }

  /**
   * Find common items that appear across multiple arrays
   * @param arrays Array of string arrays
   * @returns Array of common items
   */
  private findCommonItems(arrays: string[][]): string[] {
    if (arrays.length === 0) return [];
    if (arrays.length === 1) return arrays[0];

    // Filter out empty arrays
    const nonEmptyArrays = arrays.filter((arr) => arr.length > 0);
    if (nonEmptyArrays.length === 0) return [];

    // Count occurrences of each item across all arrays
    const itemCounts: Record<string, number> = {};
    const itemSeen: Record<string, Set<number>> = {}; // Track which arrays each item appears in

    for (let i = 0; i < nonEmptyArrays.length; i++) {
      const array = nonEmptyArrays[i];
      const seenInThisArray = new Set<string>();

      for (const item of array) {
        const normalized = item.toLowerCase();

        // Only count each item once per array
        if (!seenInThisArray.has(normalized)) {
          seenInThisArray.add(normalized);
          itemCounts[normalized] = (itemCounts[normalized] || 0) + 1;

          // Track which arrays this item appears in
          if (!itemSeen[normalized]) {
            itemSeen[normalized] = new Set();
          }
          itemSeen[normalized].add(i);
        }
      }
    }

    // Find items that appear in at least half of the arrays
    const threshold = Math.ceil(nonEmptyArrays.length / 2);
    const commonItems = Object.entries(itemCounts)
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .map(([item]) => item);

    return commonItems;
  }
}
