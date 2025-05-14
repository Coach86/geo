import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import { RawResponseService } from '../../report/services/raw-response.service';
import {
  CompanyBatchContext,
  SentimentPipelineResult,
  SentimentResults,
  WebSearchSummary,
} from '../interfaces/batch.interfaces';
import { AnalyzerConfig } from '../interfaces/llm.interfaces';
import { BasePipelineService } from './base-pipeline.service';
import { SystemPrompts, PromptTemplates, formatPrompt } from '../prompts/prompts';

@Injectable()
export class SentimentPipelineService extends BasePipelineService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly llmService: LlmService,
    protected readonly rawResponseService?: RawResponseService,
  ) {
    super(configService, llmService, SentimentPipelineService.name, 'sentiment', rawResponseService);
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
      // Get the prompts for this pipeline - could be array or JSON string
      const promptsRaw = context.promptSet?.direct || [];
      const prompts: string[] = Array.isArray(promptsRaw) 
        ? promptsRaw 
        : JSON.parse(typeof promptsRaw === 'string' ? promptsRaw : '[]');
      
      if (!prompts.length) {
        throw new Error('No direct brand prompts found for this company');
      }
      
      // Format the prompts to include the company name
      const formattedPrompts = prompts.map(prompt => 
        prompt.replace(/{COMPANY}/g, context.brandName)
      );
      
      // Get the enabled LLM models
      const enabledModels = this.getEnabledModels();
      
      if (enabledModels.length === 0) {
        throw new Error('No enabled LLM models found in configuration');
      }
      
      // Create tasks for each model and prompt
      const tasks = [];
      
      for (const modelName of enabledModels) {
        for (let i = 0; i < formattedPrompts.length; i++) {
          tasks.push(
            this.limiter(async () => {
              try {
                // Step 1: Execute the prompt with this model
                const llmResponse = await this.executePrompt(
                  modelName,
                  formattedPrompts[i],
                  context.batchExecutionId, // Pass batch execution ID for storing raw responses
                  i                 // Pass prompt index
                );

                // Step 2: Analyze the response
                return await this.analyzeResponse(
                  modelName,
                  context.brandName,
                  formattedPrompts[i],
                  llmResponse,
                  i
                );
              } catch (error) {
                this.logger.error(
                  `Error in sentiment pipeline for ${context.brandName} with ${modelName} on prompt ${i}: ${error.message}`,
                  error.stack
                );
                return {
                  llmProvider: modelName,
                  promptIndex: i,
                  sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
                  accuracy: 0,
                  extractedFacts: [],
                  originalPrompt: formattedPrompts[i],
                  error: error.message,
                };
              }
            })
          );
        }
      }
      
      // Run all tasks
      const results = await Promise.all(tasks);
      
      // Analyze and summarize results
      const summary = this.analyzeSentimentResults(results);
      
      // Generate web search summary
      const webSearchSummary = this.createWebSearchSummary(results);
      
      this.logger.log(`Completed sentiment pipeline for ${context.companyId} with ${results.length} results`);
      
      if (webSearchSummary.usedWebSearch) {
        this.logger.log(
          `Web search was used in ${webSearchSummary.webSearchCount} responses with ${webSearchSummary.consultedWebsites.length} websites consulted`
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
        error.stack
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
    modelName: string,
    brandName: string,
    prompt: string,
    llmResponseObj: any, // Changed to accept the full response object
    promptIndex: number
  ): Promise<SentimentPipelineResult> {
    this.logger.log(`Analyzing sentiment response from ${modelName} for ${brandName}`);
    
    // Extract the text from the response object
    const llmResponse = typeof llmResponseObj === 'string' 
      ? llmResponseObj 
      : llmResponseObj.text || JSON.stringify(llmResponseObj);
    
    // Extract metadata if available
    const metadata = llmResponseObj.metadata || {};
    
    // Define the schema for structured output
    const schema = z.object({
      sentiment: z
        .enum(['positive', 'neutral', 'negative'])
        .describe('Overall sentiment towards the brand'),
      accuracy: z.number().min(0).max(1).describe('Confidence score for the sentiment analysis'),
      extractedFacts: z
        .array(z.string())
        .describe('Key facts or opinions extracted from the response'),
    });
    
    // Format the user prompt using the template
    const userPrompt = formatPrompt(PromptTemplates.SENTIMENT_ANALYSIS, {
      originalPrompt: prompt,
      brandName,
      llmResponse
    });
    
    try {
      // Use the base class method for structured analysis with fallback
      const result = await this.getStructuredAnalysis(
        userPrompt,
        schema,
        SystemPrompts.SENTIMENT_ANALYSIS
      );
      
      return {
        llmProvider: modelName,
        promptIndex,
        sentiment: result.sentiment,
        accuracy: result.accuracy,
        extractedFacts: result.extractedFacts,
        originalPrompt: prompt,
        llmResponse,
        // Include web search and citation information if available
        usedWebSearch: metadata.usedWebSearch || false,
        citations: metadata.annotations || [],
        toolUsage: metadata.toolUsage || []
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
    const webSearchResults = validResults.filter(r => r.usedWebSearch);
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
   * Analyze and summarize the results of the sentiment pipeline
   * @param results Array of pipeline results
   * @returns Summary statistics
   */
  private analyzeSentimentResults(results: SentimentPipelineResult[]): SentimentResults['summary'] {
    // Filter out results with errors
    const validResults = results.filter(r => !r.error);
    
    if (validResults.length === 0) {
      return {
        overallSentiment: 'neutral',
        averageAccuracy: 0,
      };
    }
    
    // Count sentiment occurrences and calculate average accuracy
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    let totalAccuracy = 0;
    
    for (const result of validResults) {
      if (result.sentiment === 'positive') positiveCount++;
      else if (result.sentiment === 'neutral') neutralCount++;
      else if (result.sentiment === 'negative') negativeCount++;
      
      totalAccuracy += result.accuracy;
    }
    
    // Determine overall sentiment
    let overallSentiment: 'positive' | 'neutral' | 'negative';
    if (positiveCount > neutralCount && positiveCount > negativeCount) {
      overallSentiment = 'positive';
    } else if (negativeCount > neutralCount && negativeCount > positiveCount) {
      overallSentiment = 'negative';
    } else {
      overallSentiment = 'neutral';
    }
    
    // Calculate average accuracy
    const averageAccuracy = totalAccuracy / validResults.length;
    
    return {
      overallSentiment,
      averageAccuracy,
    };
  }
}