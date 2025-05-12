import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import {
  CompanyBatchContext,
  SentimentPipelineResult,
  SentimentResults,
} from '../interfaces/batch.interfaces';
import { AnalyzerConfig } from '../interfaces/llm.interfaces';
import { BasePipelineService } from './base-pipeline.service';
import { SystemPrompts, PromptTemplates, formatPrompt } from '../prompts/prompts';

@Injectable()
export class SentimentPipelineService extends BasePipelineService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly llmService: LlmService,
  ) {
    super(configService, llmService, SentimentPipelineService.name);
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
      const promptsJson = context.promptSet?.direct || '[]';
      const prompts: string[] = JSON.parse(promptsJson);
      
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
                const llmResponse = await this.executePrompt(modelName, formattedPrompts[i]);
                
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
      
      this.logger.log(`Completed sentiment pipeline for ${context.companyId} with ${results.length} results`);
      
      return {
        results,
        summary,
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
    llmResponse: string,
    promptIndex: number
  ): Promise<SentimentPipelineResult> {
    this.logger.log(`Analyzing sentiment response from ${modelName} for ${brandName}`);
    
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
      };
    } catch (error) {
      this.logger.error(`All analyzers failed for sentiment analysis: ${error.message}`);
      throw error;
    }
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