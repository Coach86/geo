import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import { RawResponseService } from './raw-response.service';
import {
  CompanyBatchContext,
  ComparisonPipelineResult,
  ComparisonResults,
  WebSearchSummary,
} from '../interfaces/batch.interfaces';
import { AnalyzerConfig, LlmModelConfig, PipelineType, PromptType } from '../interfaces/llm.interfaces';
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
   * @returns Pipeline results
   */
  async run(context: CompanyBatchContext): Promise<ComparisonResults> {
    this.logger.log(`Running comparison pipeline for ${context.companyId} (${context.brandName})`);

    try {
      // Get the prompts for this pipeline and the competitors - could be array or JSON string
      const promptsRaw = context.promptSet?.comparison || [];
      const prompts: string[] = Array.isArray(promptsRaw)
        ? promptsRaw
        : JSON.parse(typeof promptsRaw === 'string' ? promptsRaw : '[]');

      if (!prompts.length) {
        throw new Error('No comparison prompts found for this company');
      }

      // Get competitors, default to empty array if not provided
      const competitors = context.competitors || [];

      if (competitors.length === 0) {
        this.logger.warn(
          `No competitors specified for ${context.companyId}. Using generic comparison.`,
        );
      }

      // Format the competitors string for prompts
      const competitorsStr =
        competitors.length > 0 ? competitors.join(', ') : 'other companies in the industry';

      // Format the prompts to include the company name and competitors
      const formattedPrompts = prompts.map((prompt) =>
        prompt.replace(/{COMPANY}/g, context.brandName).replace(/{COMPETITORS}/g, competitorsStr),
      );

      // Get the enabled LLM models
      const enabledModels = this.getEnabledModels();

      if (enabledModels.length === 0) {
        throw new Error('No enabled LLM models found in configuration');
      }

      // Create tasks for each model and prompt
      const tasks = [];

      for (const modelConfig of enabledModels) {
        for (let i = 0; i < formattedPrompts.length; i++) {
          tasks.push(
            this.limiter(async () => {
              try {
                // Step 1: Execute the prompt with this model
                const llmResponse = await this.executePrompt(
                  modelConfig,
                  formattedPrompts[i],
                  context.batchExecutionId, // Pass batch execution ID for storing raw responses
                  i, // Pass prompt index
                );

                // Step 2: Analyze the response
                return await this.analyzeResponse(
                  modelConfig,
                  context.brandName,
                  competitors,
                  formattedPrompts[i],
                  llmResponse,
                  i,
                );
              } catch (error) {
                this.logger.error(
                  `Error in comparison pipeline for ${context.brandName} with ${modelConfig.provider}/${modelConfig.model} on prompt ${i}: ${error.message}`,
                  error.stack,
                );
                return {
                  llmProvider: modelConfig.provider,
                  llmModel: modelConfig.model,
                  promptIndex: i,
                  winner: 'unknown',
                  differentiators: [],
                  originalPrompt: formattedPrompts[i],
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
      const summary = this.analyzeComparisonResults(context.brandName, results);

      // Generate web search summary
      const webSearchSummary = this.createWebSearchSummary(results);

      this.logger.log(
        `Completed comparison pipeline for ${context.companyId} with ${results.length} results`,
      );

      if (webSearchSummary.usedWebSearch) {
        this.logger.log(
          `Web search was used in ${webSearchSummary.webSearchCount} responses with ${webSearchSummary.consultedWebsites.length} websites consulted`,
        );
      }

      return {
        results,
        summary,
        webSearchSummary,
      };
    } catch (error) {
      this.logger.error(
        `Failed to run comparison pipeline for ${context.companyId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Analyze the LLM response to determine the winner and differentiators
   * @param modelName The LLM model that generated the response
   * @param brandName The company brand name
   * @param competitors List of competitor names
   * @param prompt The original prompt
   * @param llmResponse The response from the LLM
   * @param promptIndex The index of the prompt
   * @returns Analysis of the LLM response
   */
  private async analyzeResponse(
    modelConfig: LlmModelConfig,
    brandName: string,
    competitors: string[],
    prompt: string,
    llmResponseObj: any, // Changed to accept the full response object
    promptIndex: number,
  ): Promise<ComparisonPipelineResult> {
    this.logger.log(
      `Analyzing comparison response from ${modelConfig.provider}/${modelConfig.model} for ${brandName}`,
    );

    // Extract the text from the response object
    const llmResponse =
      typeof llmResponseObj === 'string'
        ? llmResponseObj
        : llmResponseObj.text || JSON.stringify(llmResponseObj);

    // Extract metadata if available
    const metadata = llmResponseObj.metadata || {};

    // Define the schema for structured output
    const schema = z.object({
      winner: z.string().describe('The brand/company that came out ahead in the comparison'),
      differentiators: z.array(z.string()).describe('Key factors that differentiate the brands'),
    });

    // Format the user prompt using the template
    const userPrompt = formatPrompt(PromptTemplates.COMPARISON_ANALYSIS, {
      originalPrompt: prompt,
      brandName,
      llmResponse,
    });

    try {
      // Use the base class method for structured analysis with fallback
      const result = await this.getStructuredAnalysis(
        userPrompt,
        schema,
        SystemPrompts.COMPARISON_ANALYSIS,
        llmResponseObj.batchExecutionId, // Pass the batch execution ID if available
        promptIndex, // Pass the prompt index
        PromptType.COMPARISON, // Pass the prompt type
        prompt, // Pass the original prompt
        llmResponse, // Pass the original LLM response
        modelConfig.model, // Pass the original LLM model
      );

      return {
        llmProvider: modelConfig.provider,
        llmModel: modelConfig.model,
        promptIndex,
        winner: result.winner,
        differentiators: result.differentiators,
        originalPrompt: prompt,
        llmResponse,
        // Include web search and citation information if available
        usedWebSearch: metadata.usedWebSearch || false,
        citations: metadata.annotations || [],
        toolUsage: metadata.toolUsage || [],
      };
    } catch (error) {
      this.logger.error(`All analyzers failed for comparison analysis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a summary of web search usage in the results
   * @param results Array of pipeline results
   * @returns Web search summary
   */
  private createWebSearchSummary(results: ComparisonPipelineResult[]): WebSearchSummary {
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
        for (const citation of result.citations) {
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
        for (const tool of result.toolUsage) {
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
   * Analyze and summarize the results of the comparison pipeline
   * @param brandName The company's brand name
   * @param results Array of pipeline results
   * @returns Summary statistics
   */
  private analyzeComparisonResults(
    brandName: string,
    results: ComparisonPipelineResult[],
  ): ComparisonResults['summary'] {
    // Filter out results with errors
    const validResults = results.filter((r) => !r.error);

    if (validResults.length === 0) {
      return {
        winRate: 0,
        keyDifferentiators: [],
      };
    }

    // Calculate win rate for the company
    const normalizedBrandName = brandName.toLowerCase();
    let winCount = 0;

    for (const result of validResults) {
      if (result.winner && result.winner.toLowerCase().includes(normalizedBrandName)) {
        winCount++;
      }
    }

    const winRate = winCount / validResults.length;

    // Count differentiators across all results
    const differentiatorCounts: Record<string, number> = {};
    for (const result of validResults) {
      for (const diff of result.differentiators) {
        const normalizedDiff = diff.toLowerCase();
        differentiatorCounts[normalizedDiff] = (differentiatorCounts[normalizedDiff] || 0) + 1;
      }
    }

    // Sort by count and take top differentiators
    const keyDifferentiators = Object.entries(differentiatorCounts)
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 10)
      .map(([diff]) => diff);

    return {
      winRate,
      keyDifferentiators,
    };
  }
}
