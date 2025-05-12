import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import {
  CompanyBatchContext,
  ComparisonPipelineResult,
  ComparisonResults,
} from '../interfaces/batch.interfaces';
import { AnalyzerConfig } from '../interfaces/llm.interfaces';
import { BasePipelineService } from './base-pipeline.service';
import { SystemPrompts, PromptTemplates, formatPrompt } from '../prompts/prompts';

@Injectable()
export class ComparisonPipelineService extends BasePipelineService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly llmService: LlmService,
  ) {
    super(configService, llmService, ComparisonPipelineService.name);
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
      // Get the prompts for this pipeline and the competitors
      const promptsJson = context.promptSet?.comparison || '[]';
      const prompts: string[] = JSON.parse(promptsJson);
      
      if (!prompts.length) {
        throw new Error('No comparison prompts found for this company');
      }
      
      // Get competitors, default to empty array if not provided
      const competitors = context.competitors || [];
      
      if (competitors.length === 0) {
        this.logger.warn(`No competitors specified for ${context.companyId}. Using generic comparison.`);
      }
      
      // Format the competitors string for prompts
      const competitorsStr = competitors.length > 0 
        ? competitors.join(', ') 
        : 'other companies in the industry';
      
      // Format the prompts to include the company name and competitors
      const formattedPrompts = prompts.map(prompt => 
        prompt
          .replace(/{COMPANY}/g, context.brandName)
          .replace(/{COMPETITORS}/g, competitorsStr)
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
                  competitors,
                  formattedPrompts[i],
                  llmResponse,
                  i
                );
              } catch (error) {
                this.logger.error(
                  `Error in comparison pipeline for ${context.brandName} with ${modelName} on prompt ${i}: ${error.message}`,
                  error.stack
                );
                return {
                  llmProvider: modelName,
                  promptIndex: i,
                  winner: 'unknown',
                  differentiators: [],
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
      const summary = this.analyzeComparisonResults(context.brandName, results);
      
      this.logger.log(`Completed comparison pipeline for ${context.companyId} with ${results.length} results`);
      
      return {
        results,
        summary,
      };
    } catch (error) {
      this.logger.error(
        `Failed to run comparison pipeline for ${context.companyId}: ${error.message}`,
        error.stack
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
    modelName: string,
    brandName: string,
    competitors: string[],
    prompt: string,
    llmResponse: string,
    promptIndex: number
  ): Promise<ComparisonPipelineResult> {
    this.logger.log(`Analyzing comparison response from ${modelName} for ${brandName}`);
    
    // Define the schema for structured output
    const schema = z.object({
      winner: z.string().describe('The brand/company that came out ahead in the comparison'),
      differentiators: z.array(z.string()).describe('Key factors that differentiate the brands'),
    });
    
    // Format the user prompt using the template
    const userPrompt = formatPrompt(PromptTemplates.COMPARISON_ANALYSIS, {
      originalPrompt: prompt,
      brandName,
      llmResponse
    });
    
    try {
      // Use the base class method for structured analysis with fallback
      const result = await this.getStructuredAnalysis(
        userPrompt,
        schema,
        SystemPrompts.COMPARISON_ANALYSIS
      );
      
      return {
        llmProvider: modelName,
        promptIndex,
        winner: result.winner,
        differentiators: result.differentiators,
        originalPrompt: prompt,
        llmResponse,
      };
    } catch (error) {
      this.logger.error(`All analyzers failed for comparison analysis: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Analyze and summarize the results of the comparison pipeline
   * @param brandName The company's brand name
   * @param results Array of pipeline results
   * @returns Summary statistics
   */
  private analyzeComparisonResults(
    brandName: string,
    results: ComparisonPipelineResult[]
  ): ComparisonResults['summary'] {
    // Filter out results with errors
    const validResults = results.filter(r => !r.error);
    
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