import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import { RawResponseService } from './raw-response.service';
import {
  CompanyBatchContext,
  AccuracyPipelineResult,
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

/**
 * Results from the accuracy pipeline
 */
export interface AccuracyResults {
  results: AccuracyPipelineResult[];
  summary: {
    averageAttributeScores: Record<string, number>;
  };
  webSearchSummary: WebSearchSummary;
}

@Injectable()
export class AccuracyPipelineService extends BasePipelineService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly llmService: LlmService,
    protected readonly rawResponseService?: RawResponseService,
  ) {
    super(
      configService,
      llmService,
      AccuracyPipelineService.name,
      PipelineType.ACCURACY,
      rawResponseService,
    );
  }

  /**
   * Get analyzer config for this specific pipeline
   */
  protected getAnalyzerConfig(): AnalyzerConfig {
    // Initially use the sentiment analyzer config since that's what we're extending from
    // Can be updated to use a dedicated config in the future
    return this.config.analyzerConfig.sentiment;
  }

  /**
   * Run the accuracy analysis pipeline for a company
   * @param context Company batch context
   * @returns Pipeline results
   */
  async run(context: CompanyBatchContext): Promise<AccuracyResults> {
    this.logger.log(`Running accuracy pipeline for ${context.companyId} (${context.brandName})`);

    try {
      // Get the prompts for this pipeline
      const prompts = context.promptSet?.accuracy || [];
      
      if (!prompts.length) {
        throw new Error('No accuracy prompts found for this company');
      }

      // Format the prompts to include the company name
      const formattedPrompts = prompts.map((prompt) =>
        prompt.replace(/{COMPANY}/g, context.brandName),
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
              const prompt = `
              ${formattedPrompts[i]}
              <context>
                Company Url: ${context.websiteUrl}
                Market: ${context.market}
              </context>
              `;
              try {
                // Step 1: Execute the prompt with this model
                const llmResponse = await this.executePrompt(
                  modelConfig,
                  prompt,
                  context.batchExecutionId, // Pass batch execution ID for storing raw responses
                  i, // Pass prompt index
                );

                // Step 2: Analyze the accuracy of the response
                return await this.analyzeAccuracy(
                  modelConfig,
                  context.brandName,
                  prompt,
                  llmResponse,
                  i,
                  context.keyBrandAttributes,
                );
              } catch (error) {
                this.logger.error(
                  `Error in accuracy pipeline for ${context.brandName} with ${modelConfig.provider}/${modelConfig.model} on prompt ${i}: ${error.message}`,
                  error.stack,
                );
                return {
                  llmProvider: modelConfig.provider,
                  llmModel: modelConfig.model,
                  promptIndex: i,
                  attributeScores: [],
                  originalPrompt: prompt,
                  error: error.message,
                };
              }
            }),
          );
        }
      }

      // Run all tasks
      const results = await Promise.all(tasks);

      // Generate web search summary
      const webSearchSummary = this.createWebSearchSummary(results);

      // Calculate average accuracy
      const summary = this.analyzeAccuracyResults(results);

      this.logger.log(
        `Completed accuracy pipeline for ${context.companyId} with ${results.length} results`,
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
        `Failed to run accuracy pipeline for ${context.companyId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Analyze the LLM response to determine accuracy of facts
   * @param modelName The LLM model that generated the response
   * @param brandName The company brand name
   * @param prompt The original prompt
   * @param llmResponse The response from the LLM
   * @param promptIndex The index of the prompt
   * @returns Analysis of the LLM response accuracy
   */
  private async analyzeAccuracy(
    modelConfig: LlmModelConfig,
    brandName: string,
    prompt: string,
    llmResponseObj: any,
    promptIndex: number,
    keyBrandAttributes?: string[],
  ): Promise<AccuracyPipelineResult> {
    this.logger.log(
      `Analyzing accuracy for ${modelConfig.provider}/${modelConfig.model} response for ${brandName}`,
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
      attributeScores: z.array(
        z.object({
          attribute: z.string().describe('The specific brand attribute being evaluated'),
          score: z.number().describe('Alignment score for this specific attribute (0-1)'),
          evaluation: z.string().describe('Brief explanation for the assigned score'),
        })
      ).describe('Detailed scores for each individual key brand attribute'),
    });

    if (!keyBrandAttributes) {
      throw new Error('No key brand attributes found');
    }

    // Format the user prompt using the template for accuracy analysis
    const userPrompt = formatPrompt(PromptTemplates.ACCURACY_ANALYSIS, {
      originalPrompt: prompt,
      brandName,
      keyBrandAttributes: keyBrandAttributes.join(', '),
      llmResponse,
    });

    try {
      // Use the base class method for structured analysis with fallback
      const result = await this.getStructuredAnalysis(
        userPrompt,
        schema,
        SystemPrompts.ACCURACY_ANALYSIS,
        llmResponseObj.batchExecutionId, // Pass the batch execution ID if available
        promptIndex, // Pass the prompt index
        PromptType.ACCURACY, // Pass the prompt type using enum
        prompt, // Pass the original prompt
        llmResponse, // Pass the original LLM response
        modelConfig.model, // Pass the original LLM model
      );

      return {
        llmProvider: modelConfig.provider,
        llmModel: modelConfig.model,
        promptIndex,
        attributeScores: result.attributeScores || [],
        originalPrompt: prompt,
        llmResponse,
        // Include web search and citation information if available
        usedWebSearch: metadata.usedWebSearch || false,
        citations: metadata.annotations || [],
        toolUsage: metadata.toolUsage || [],
      };
    } catch (error) {
      this.logger.error(`All analyzers failed for accuracy analysis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a summary of web search usage in the results
   * @param results Array of pipeline results
   * @returns Web search summary
   */
  private createWebSearchSummary(results: AccuracyPipelineResult[]): WebSearchSummary {
    // Filter out results with errors
    const validResults = results.filter((r) => !r.error);

    if (validResults.length === 0) {
      return {
        usedWebSearch: false,
        webSearchCount: 0,
        consultedWebsites: [],
        consultedWebsiteCounts: [],
      };
    }

    // Check which results used web search
    const webSearchResults = validResults.filter((r) => r.usedWebSearch);
    const webSearchCount = webSearchResults.length;
    const usedWebSearch = webSearchCount > 0;

    // Use a Map to count occurrences of each normalized domain
    const websiteCounts = new Map<string, number>();
    
    // Helper function to normalize and store domain
    const processDomain = (domain: string): void => {
      // Normalize domain: remove www. prefix and convert to lowercase
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      
      // Increment the count for this domain
      websiteCounts.set(normalizedDomain, (websiteCounts.get(normalizedDomain) || 0) + 1);
    };

    for (const result of webSearchResults) {
      // Check citations
      if (result.citations && result.citations.length > 0) {
        for (const citation of result.citations) {
          if (citation.url) {
            // Extract the domain from the URL
            try {
              const url = new URL(citation.url);
              processDomain(url.hostname);
            } catch (e) {
              // If URL parsing fails, just use the raw URL
              processDomain(citation.url);
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
                processDomain(parsedUrl.hostname);
              } catch (e) {
                processDomain(url);
              }
            }
          }
        }
      }
    }

    // Convert the Map to an array of WebsiteCount objects
    const consultedWebsiteCounts = Array.from(websiteCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count); // Sort by count, descending

    // Get unique domains for backward compatibility
    const consultedWebsites = consultedWebsiteCounts.map(item => item.domain);

    return {
      usedWebSearch,
      webSearchCount,
      consultedWebsites,
      consultedWebsiteCounts,
    };
  }

  /**
   * Analyze attribute scores from the results
   * @param results Array of pipeline results
   * @returns Summary with average attribute scores
   */
  private analyzeAccuracyResults(results: AccuracyPipelineResult[]): AccuracyResults['summary'] {
    // Filter out results with errors
    const validResults = results.filter((r) => !r.error);

    if (validResults.length === 0) {
      return {
        averageAttributeScores: {},
      };
    }

    // Collect all attribute scores
    const attributeTotals: Record<string, {total: number, count: number}> = {};

    // Collect all attribute scores across all results
    for (const result of validResults) {
      if (result.attributeScores && result.attributeScores.length > 0) {
        for (const attrScore of result.attributeScores) {
          if (!attributeTotals[attrScore.attribute]) {
            attributeTotals[attrScore.attribute] = { total: 0, count: 0 };
          }
          attributeTotals[attrScore.attribute].total += attrScore.score;
          attributeTotals[attrScore.attribute].count += 1;
        }
      }
    }

    // Calculate average score for each attribute
    const averageAttributeScores: Record<string, number> = {};
    
    for (const [attribute, data] of Object.entries(attributeTotals)) {
      averageAttributeScores[attribute] = data.total / data.count;
    }

    return {
      averageAttributeScores,
    };
  }
}
