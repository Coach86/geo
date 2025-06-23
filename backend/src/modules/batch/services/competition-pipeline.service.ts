import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import { RawResponseService } from './raw-response.service';
import {
  BrandBattleAnalysis,
  BrandBattlePipelineResult,
  ProjectBatchContext,
  CompetitionResults,
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
export class CompetitionPipelineService extends BasePipelineService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly llmService: LlmService,
    protected readonly rawResponseService?: RawResponseService,
  ) {
    super(
      configService,
      llmService,
      CompetitionPipelineService.name,
      PipelineType.COMPETITION,
      rawResponseService,
    );
  }

  /**
   * Get analyzer config for this specific pipeline
   */
  protected getAnalyzerConfig(): AnalyzerConfig {
    return this.config.analyzerConfig.competition;
  }

  /**
   * Run the competition pipeline for a company
   * @param context Company batch context
   * @returns Competition results with brand battle data
   */
  async run(context: ProjectBatchContext): Promise<CompetitionResults> {
    this.logger.log(
      `[COMP-001] Running competition pipeline for ${context.projectId} (${context.brandName})`,
    );

    try {
      // Get competition prompts
      const competitionPrompts = context.promptSet?.competition || [];

      if (!competitionPrompts.length) {
        throw new Error('No competition prompts found for this company');
      }

      // Get competitors, default to empty array if not provided
      const competitors = context.competitors || [];

      if (competitors.length === 0) {
        this.logger.error(
          `No competitors specified for ${context.projectId}. Brand battle requires competitors.`,
        );
        throw new Error('Brand battle requires competitors to be specified');
      }

      const competitionResults = await this.runCompetition(context, competitionPrompts, competitors);

      this.logger.log(
        `[COMP-002] Completed competition pipeline for ${context.projectId} with ${competitionResults.results.length} results`,
      );
      
      // Log detailed results
      this.logger.log(`[COMP-003] Competition results structure: ${JSON.stringify({
        resultsCount: competitionResults.results.length,
        hasFirstResult: !!competitionResults.results[0],
        firstResultHasLlmResponse: competitionResults.results[0]?.llmResponse ? true : false,
        firstResultLlmResponseLength: competitionResults.results[0]?.llmResponse?.length || 0
      })}`);

      return competitionResults;
    } catch (error) {
      this.logger.error(
        `Failed to run competition pipeline for ${context.projectId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a summary of web search usage in the results
   * @param results Array of competition pipeline results
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
   * Run the competition pipeline for a company against each competitor
   * @param context Company batch context
   * @param prompts Array of brand battle prompts
   * @param competitors Array of competitor names
   * @returns Competition results with brand battle data
   */
  private async runCompetition(
    context: ProjectBatchContext,
    prompts: string[],
    competitors: string[],
  ): Promise<CompetitionResults> {
    this.logger.log(
      `[COMP-004] Running competition for ${context.projectId} against ${competitors.length} competitors`,
    );

    // Get the enabled LLM models
    const allEnabledModels = this.getEnabledModels();

    if (allEnabledModels.length === 0) {
      throw new Error('No enabled LLM models found in configuration');
    }

    // Filter by selected models if provided
    const enabledModels = context.selectedModels?.length 
      ? allEnabledModels.filter(model => 
          context.selectedModels!.includes(model.id)
        )
      : allEnabledModels;

    if (enabledModels.length === 0) {
      throw new Error('None of the selected models are enabled');
    }

    // Create tasks for each model, prompt, and competitor
    const tasks = [];
    
    this.logger.log(`[COMP-005] Creating tasks for ${enabledModels.length} models, ${prompts.length} prompts, ${competitors.length} competitors`);

    for (const modelConfig of enabledModels) {
      for (let promptIndex = 0; promptIndex < prompts.length; promptIndex++) {
        for (const competitor of competitors) {
          const formattedPrompt = prompts[promptIndex]
            .replace(/{COMPANY}/g, context.brandName)
            .replace(/{COMPETITOR}/g, competitor);

          const injectedPrompt = `${formattedPrompt}
          <context>
            ${context.brandName}'s URL: ${context.websiteUrl}
          </context>
          `;

          tasks.push(
            this.limiter(async () => {
              try {
                // Execute the prompt with this model
                const llmResponse = await this.executePrompt(
                  modelConfig,
                  injectedPrompt,
                  context.batchExecutionId,
                  promptIndex,
                );

                // Analyze the response
                return await this.analyzeCompetitionResponse(
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
                  llmResponse: '', // Empty on error
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
    
    this.logger.log(`[COMP-006] Completed ${results.length} tasks. First result: ${JSON.stringify({
      hasResult: !!results[0],
      model: results[0]?.llmModel,
      hasLlmResponse: !!results[0]?.llmResponse,
      llmResponseLength: results[0]?.llmResponse?.length || 0
    })}`);

    // Analyze and summarize competition results
    const competitorAnalyses = this.analyzeCompetitionResults(
      context.brandName,
      competitors,
      results,
    );

    // Find common strengths and weaknesses across all competitors
    const commonStrengths = this.findCommonItems(results.map((r) => r.brandStrengths || []));
    const commonWeaknesses = this.findCommonItems(results.map((r) => r.brandWeaknesses || []));

    // Generate web search summary
    const webSearchSummary = this.createWebSearchSummary(results);

    this.logger.log(`[COMP-007] Returning CompetitionResults with ${results.length} results, ${competitorAnalyses.length} competitor analyses`);
    
    const competitionResults = {
      results,
      summary: {
        competitorAnalyses,
        commonStrengths,
        commonWeaknesses,
      },
      webSearchSummary,
    };
    
    // Log first result for debugging
    if (results.length > 0) {
      this.logger.log(`[COMP-008] First result: ${JSON.stringify({
        model: results[0].llmModel,
        competitor: results[0].competitor,
        hasOriginalPrompt: !!results[0].originalPrompt,
        hasLlmResponse: !!results[0].llmResponse,
        hasError: !!results[0].error,
        strengthsCount: results[0].brandStrengths?.length || 0,
        weaknessesCount: results[0].brandWeaknesses?.length || 0,
      })}`);
    }
    
    this.logger.log(`[COMP-009] Final return - results count: ${competitionResults.results.length}, first result has llmResponse: ${competitionResults.results.length > 0 ? !!competitionResults.results[0].llmResponse : 'N/A'}`);
    return competitionResults;
  }

  /**
   * Analyze the LLM response for competition to extract strengths and weaknesses
   * @param modelConfig The LLM model configuration
   * @param brandName The company brand name
   * @param competitor The competitor name
   * @param prompt The original prompt
   * @param llmResponseObj The response from the LLM
   * @param promptIndex The index of the prompt
   * @returns Analysis of the LLM response for competition
   */
  private async analyzeCompetitionResponse(
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
      `[COMP-010] Analyzing competition response from ${modelConfig.provider}/${modelConfig.model} for ${brandName} vs ${competitor}`,
    );

    // Extract the text from the response object
    const llmResponse =
      typeof llmResponseObj === 'string'
        ? llmResponseObj
        : llmResponseObj.text || JSON.stringify(llmResponseObj);

    // Extract metadata if available
    const metadata = typeof llmResponseObj === 'string' ? {} : llmResponseObj.metadata || {};
    
    // Debug logging
    this.logger.log(`[COMP-011] Competition response metadata: ${JSON.stringify({
      hasMetadata: !!metadata,
      usedWebSearch: metadata.usedWebSearch,
      annotationsCount: metadata.annotations?.length || 0,
      toolUsageCount: metadata.toolUsage?.length || 0,
      llmResponseLength: llmResponse?.length || 0,
      llmResponsePreview: llmResponse?.substring(0, 50) + '...'
    })}`);

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
    const userPrompt = formatPrompt(PromptTemplates.COMPETITION_ANALYSIS, {
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
        SystemPrompts.COMPETITION_ANALYSIS,
        typeof llmResponseObj === 'string' ? undefined : llmResponseObj.batchExecutionId,
        promptIndex,
        PromptType.COMPETITION,
        prompt,
        llmResponse,
        modelConfig.model,
        // Add competitor as part of the model identifier to ensure uniqueness per competitor
        `${modelConfig.model}_${competitor}`,
      );

      const competitionResult = {
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
      
      // Debug logging
      this.logger.log(`[COMP-012] Returning competition result: ${JSON.stringify({
        model: competitionResult.llmModel,
        competitor: competitionResult.competitor,
        citationsCount: competitionResult.citations.length,
        usedWebSearch: competitionResult.usedWebSearch,
        hasLlmResponse: !!competitionResult.llmResponse,
        llmResponseLength: competitionResult.llmResponse?.length || 0
      })}`);
      
      return competitionResult;
    } catch (error) {
      this.logger.error(`All analyzers failed for competition analysis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze and summarize competition results
   * @param brandName The company's brand name
   * @param competitors List of competitor names
   * @param results Array of competition pipeline results
   * @returns Array of competitor analyses
   */
  private analyzeCompetitionResults(
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
