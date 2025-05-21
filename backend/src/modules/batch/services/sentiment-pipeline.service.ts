import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import { RawResponseService } from './raw-response.service';
import {
  CompanyBatchContext,
  SentimentPipelineResult,
  SentimentResults,
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
export class SentimentPipelineService extends BasePipelineService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly llmService: LlmService,
    protected readonly rawResponseService?: RawResponseService,
  ) {
    super(
      configService,
      llmService,
      SentimentPipelineService.name,
      PipelineType.SENTIMENT,
      rawResponseService,
    );
  }

  /**
   * Get analyzer config for this specific pipeline
   */
  protected getAnalyzerConfig(): AnalyzerConfig {
    return this.config.analyzerConfig.sentiment;
  }

  /**
   * Run the sentiment analysis pipeline for a company
   * @param context Company batch context
   * @returns Pipeline results
   */
  async run(context: CompanyBatchContext): Promise<SentimentResults> {
    this.logger.log(`Running sentiment pipeline for ${context.companyId} (${context.brandName})`);

    try {
      // Get the prompts for this pipeline
      const prompts = context.promptSet?.direct || [];
      
      if (!prompts.length) {
        throw new Error('No direct brand prompts found for this company');
      }

      // Format the prompts to include the company name
      const formattedPrompts = prompts.map((prompt) =>
        (prompt || '').replace(/{COMPANY}/g, context.brandName || ''),
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
          const websiteUrl = context.websiteUrl || '';
          const market = context.market || '';
          const executionPrompt = `
                ${formattedPrompts[i]} 
                <context>
                Company Url: ${websiteUrl}
                Market: ${market}
                </context>`;
          tasks.push(
            this.limiter(async () => {
              try {
                // Step 1: Execute the prompt with this model
                const llmResponse = await this.executePrompt(
                  modelConfig,
                  executionPrompt,
                  context.batchExecutionId, // Pass batch execution ID for storing raw responses
                  i, // Pass prompt index
                );

                // Step 2: Analyze the response
                return await this.analyzeResponse(
                  modelConfig,
                  context.brandName || '',
                  executionPrompt,
                  llmResponse,
                  i,
                );
              } catch (error) {
                this.logger.error(
                  `Error in sentiment pipeline for ${context.brandName || ''} with ${modelConfig.provider || 'unknown'}/${modelConfig.model || 'unknown'} on prompt ${i}: ${error.message}`,
                  error.stack,
                );
                return {
                  llmProvider: modelConfig.provider || 'unknown',
                  llmModel: modelConfig.model || 'unknown',
                  promptIndex: i,
                  sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
                  accuracy: 0,
                  extractedPositiveKeywords: [],
                  extractedNegativeKeywords: [],
                  originalPrompt: executionPrompt,
                  error: error.message,
                };
              }
            }),
          );
        }
      }

      // Run all tasks
      const results = await Promise.all(tasks);

      // Analyze and summarize results - only for sentiment, not accuracy
      const summary = this.analyzeSentimentResults(results);

      // Generate web search summary
      const webSearchSummary = this.createWebSearchSummary(results);

      this.logger.log(
        `Completed sentiment pipeline for ${context.companyId} with ${results.length} results`,
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
        `Failed to run sentiment pipeline for ${context.companyId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Analyze the LLM response to determine sentiment and extract facts
   * @param modelName The LLM model that generated the response
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
    llmResponseObj: any, // Changed to accept the full response object
    promptIndex: number,
  ): Promise<SentimentPipelineResult> {
    this.logger.log(
      `Analyzing sentiment response from ${modelConfig.provider}/${modelConfig.model} for ${brandName}`,
    );

    // Extract the text from the response object
    const llmResponse =
      typeof llmResponseObj === 'string'
        ? llmResponseObj
        : llmResponseObj.text || JSON.stringify(llmResponseObj);

    // Extract metadata if available
    const metadata = llmResponseObj.metadata || {};

    // Define the schema for structured output - removed accuracy
    const schema = z.object({
      sentiment: z
        .enum(['positive', 'neutral', 'negative'])
        .describe('Overall sentiment towards the brand'),
      extractedPositiveKeywords: z
        .array(z.string())
        .describe('Key words or phrases extracted from the response that are positive'),
      extractedNegativeKeywords: z
        .array(z.string())
        .describe('Key words or phrases extracted from the response that are negative'),
    });

    // Format the user prompt using the template
    const userPrompt = formatPrompt(PromptTemplates.SENTIMENT_ANALYSIS, {
      originalPrompt: prompt,
      brandName,
      llmResponse,
    });

    try {
      // Use the base class method for structured analysis with fallback
      const result = await this.getStructuredAnalysis(
        userPrompt,
        schema,
        SystemPrompts.SENTIMENT_ANALYSIS,
        llmResponseObj.batchExecutionId, // Pass the batch execution ID if available
        promptIndex, // Pass the prompt index
        PromptType.SENTIMENT, // Pass the prompt type using enum
        prompt, // Pass the original prompt
        llmResponse, // Pass the original LLM response
        modelConfig.model, // Pass the original LLM model
      );

      return {
        llmProvider: modelConfig.provider,
        llmModel: modelConfig.model,
        promptIndex,
        sentiment: result.sentiment,
        accuracy: 0, // Set default accuracy to 0, will be filled by accuracy pipeline
        extractedPositiveKeywords: result.extractedPositiveKeywords || [],
        extractedNegativeKeywords: result.extractedNegativeKeywords || [],
        originalPrompt: prompt,
        llmResponse,
        // Include web search and citation information if available
        usedWebSearch: metadata.usedWebSearch || false,
        citations: metadata.annotations || [],
        toolUsage: metadata.toolUsage || [],
      };
    } catch (error) {
      this.logger.error(`All analyzers failed for sentiment analysis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a summary of web search usage in the results
   * @param results Array of pipeline results
   * @returns Web search summary
   */
  private createWebSearchSummary(results: SentimentPipelineResult[]): WebSearchSummary {
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
    const webSearchResults = validResults.filter((r) => r?.usedWebSearch === true);
    const webSearchCount = webSearchResults.length;
    const usedWebSearch = webSearchCount > 0;

    // Collect unique websites consulted from citations and tool usage
    const websites = new Set<string>();

    for (const result of webSearchResults) {
      // Check citations
      if (Array.isArray(result.citations) && result.citations.length > 0) {
        for (const citation of result.citations) {
          if (citation && citation.url) {
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
      if (Array.isArray(result.toolUsage) && result.toolUsage.length > 0) {
        for (const tool of result.toolUsage) {
          if (tool && tool.execution_details) {
            // Check if there are execution details with URLs
            if (Array.isArray(tool.execution_details.urls) && tool.execution_details.urls.length > 0) {
              for (const url of tool.execution_details.urls) {
                if (url) {
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
      }
    }

    return {
      usedWebSearch,
      webSearchCount,
      consultedWebsites: Array.from(websites),
    };
  }

  /**
   * Analyze and summarize the results of the sentiment pipeline
   * @param results Array of pipeline results
   * @returns Summary statistics for sentiment only (not accuracy)
   */
  private analyzeSentimentResults(results: SentimentPipelineResult[]): SentimentResults['summary'] {
    // Filter out results with errors
    const validResults = results.filter((r) => !r.error);

    if (validResults.length === 0) {
      return {
        overallSentiment: 'neutral',
        overallSentimentPercentage: 0,
      };
    }

    // Count sentiment occurrences
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    let overallSentimentPercentage = 0;

    for (const result of validResults) {
      // Handle cases where sentiment might be undefined or not matching expected values
      const sentiment = result.sentiment || 'neutral';
      
      if (sentiment === 'positive') positiveCount++;
      else if (sentiment === 'neutral') neutralCount++;
      else if (sentiment === 'negative') negativeCount++;
      
      overallSentimentPercentage +=
        sentiment === 'positive' ? 1 : sentiment === 'neutral' ? 0 : -1;
    }
    overallSentimentPercentage = overallSentimentPercentage / validResults.length;

    // Determine overall sentiment
    let overallSentiment: 'positive' | 'neutral' | 'negative';
    if (positiveCount > neutralCount && positiveCount > negativeCount) {
      overallSentiment = 'positive';
    } else if (negativeCount > neutralCount && negativeCount > positiveCount) {
      overallSentiment = 'negative';
    } else {
      overallSentiment = 'neutral';
    }

    return {
      overallSentiment,
      overallSentimentPercentage,
    };
  }
}
