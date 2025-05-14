import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import { RawResponseService } from '../../report/services/raw-response.service';
import {
  BrandVisibilitySummary,
  CompanyBatchContext,
  ModelBreakdown,
  SpontaneousPipelineResult,
  SpontaneousResults,
  WebSearchSummary,
} from '../interfaces/batch.interfaces';
import { AnalyzerConfig, LlmModelConfig } from '../interfaces/llm.interfaces';
import { BasePipelineService } from './base-pipeline.service';
import { SystemPrompts, PromptTemplates, formatPrompt } from '../prompts/prompts';

@Injectable()
export class SpontaneousPipelineService extends BasePipelineService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly llmService: LlmService,
    protected readonly rawResponseService?: RawResponseService,
  ) {
    super(configService, llmService, SpontaneousPipelineService.name, 'spontaneous', rawResponseService);
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
      // Get the prompts for this pipeline - could be array or JSON string
      const promptsRaw = context.promptSet?.spontaneous || [];
      const prompts: string[] = Array.isArray(promptsRaw) 
        ? promptsRaw 
        : JSON.parse(typeof promptsRaw === 'string' ? promptsRaw : '[]');

      if (!prompts.length) {
        throw new Error('No spontaneous prompts found for this company');
      }

      // Get the enabled LLM models from configuration
      const enabledModels = this.config.llmModels.filter((model) => model.enabled);

      if (enabledModels.length === 0) {
        throw new Error('No enabled LLM models found in configuration');
      }

      // Get the number of runs per model from config (default to 1 if not specified)
      const runsPerModel = this.getAnalyzerConfig().runsPerModel || 1;
      this.logger.log(`Running each model ${runsPerModel} times per prompt`);
      
      // Create tasks for each model and prompt, running each multiple times
      const tasks = [];

      for (const modelConfig of enabledModels) {
        for (let i = 0; i < prompts.length; i++) {
          // Run each model/prompt combination multiple times based on config
          for (let runIndex = 0; runIndex < runsPerModel; runIndex++) {
            tasks.push(
              this.limiter(async () => {
                try {
                  this.logger.log(`Executing run ${runIndex + 1}/${runsPerModel} for ${modelConfig.provider}/${modelConfig.model} with prompt ${i + 1}`);
                  
                  // Step 1: Execute the prompt with this model
                  const llmResponse = await this.executePrompt(
                    modelConfig.id,
                    prompts[i],
                    context.batchExecutionId, // Pass batch execution ID for storing raw responses
                    i                 // Pass prompt index
                  );

                  // Step 2: Analyze the response
                  return await this.analyzeResponse(
                    modelConfig,
                    context.brandName,
                    prompts[i],
                    llmResponse,
                    i,
                    runIndex // Pass the run index for tracking
                  );
                } catch (error) {
                  this.logger.error(
                    `Error in spontaneous pipeline for ${context.brandName} with ${modelConfig.provider}/${modelConfig.model} on prompt ${i}, run ${runIndex + 1}: ${error.message}`,
                    error.stack,
                  );
                  return {
                    llmProvider: `${modelConfig.provider}/${modelConfig.model}`,
                    promptIndex: i,
                    runIndex: runIndex,
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
      }

      // Run all tasks
      const results = await Promise.all(tasks);

      // Analyze and summarize results
      const summary = this.analyzeSpontaneousResults(results);
      
      // Generate web search summary
      const webSearchSummary = this.createWebSearchSummary(results);
      
      // Generate brand visibility summary for the UI dashboard
      const brandVisibility = this.generateBrandVisibilitySummary(results);

      this.logger.log(
        `Completed spontaneous pipeline for ${context.companyId} with ${results.length} results`,
      );
      
      if (webSearchSummary.usedWebSearch) {
        this.logger.log(
          `Web search was used in ${webSearchSummary.webSearchCount} responses with ${webSearchSummary.consultedWebsites.length} websites consulted`
        );
      }
      
      this.logger.log(
        `Brand visibility: ${(brandVisibility.globalMentionRate * 100).toFixed(1)}% across ${brandVisibility.promptsTested} prompts and ${brandVisibility.modelBreakdown.length} models`
      );

      return {
        results,
        summary,
        webSearchSummary,
        brandVisibility,
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
   * @param runIndex The index of the run for this model/prompt combination
   * @returns Analysis of the LLM response
   */
  private async analyzeResponse(
    modelConfig: LlmModelConfig,
    brandName: string,
    prompt: string,
    llmResponseObj: any, // Changed to accept the full response object
    promptIndex: number,
    runIndex: number = 0, // Default to 0 for backward compatibility
  ): Promise<SpontaneousPipelineResult> {
    this.logger.log(
      `Analyzing response from ${modelConfig.provider}/${modelConfig.model} for spontaneous mention of ${brandName}`,
    );

    // Extract the text from the response object
    const llmResponse = typeof llmResponseObj === 'string' 
      ? llmResponseObj 
      : llmResponseObj.text || JSON.stringify(llmResponseObj);
    
    // Extract metadata if available
    const metadata = llmResponseObj.metadata || {};

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
        runIndex,  // Include the run index in the result
        mentioned,
        topOfMind: result.topOfMind,
        originalPrompt: prompt,
        llmResponse,
        // Include web search and citation information if available
        usedWebSearch: metadata.usedWebSearch || false,
        citations: metadata.annotations || [],
        toolUsage: metadata.toolUsage || [],
        // Include the full LLM response object for provider-specific metadata extraction
        llmResponseObj: llmResponseObj
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
  /**
   * Create a summary of web search usage in the results
   * @param results Array of pipeline results
   * @returns Web search summary
   */
  private createWebSearchSummary(results: SpontaneousPipelineResult[]): WebSearchSummary {
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
    
    // Collect unique websites consulted from metadata and citations
    const websites = new Set<string>();
    
    for (const result of webSearchResults) {
      // First check for structured URLs in responseMetadata which is the most reliable source
      const llmResponseObj = result.llmResponseObj || {};
      const metadata = (llmResponseObj.metadata || llmResponseObj.responseMetadata || {});
      
      // Extract websites based on LLM provider format
      // Anthropic: Look for web_search_tool_result in content blocks
      if (result.llmProvider.includes('Anthropic')) {
        // Check if we have the full response object with content blocks
        const content = (metadata.responseMetadata?.content || metadata.content || []);
        for (const block of content) {
          if (block.type === 'web_search_tool_result' && block.content) {
            for (const webResult of block.content) {
              if (webResult.type === 'web_search_result' && webResult.url) {
                try {
                  const url = new URL(webResult.url);
                  websites.add(url.hostname);
                } catch (e) {
                  // If URL parsing fails, just use the raw URL
                  websites.add(webResult.url);
                }
              }
            }
          }
        }
      }
      
      // OpenAI: Check for webSearchResults in responseMetadata
      if (result.llmProvider.includes('OpenAI')) {
        const webSearchResults = metadata.webSearchResults || [];
        for (const webResult of webSearchResults) {
          if (webResult.url) {
            try {
              const url = new URL(webResult.url);
              websites.add(url.hostname);
            } catch (e) {
              websites.add(webResult.url);
            }
          }
        }
      }
      
      // Perplexity: Always uses web search, check for webSearchResults in metadata
      if (result.llmProvider.includes('Perplexity')) {
        const webSearchResults = metadata.webSearchResults || [];
        for (const webResult of webSearchResults) {
          if (webResult.url) {
            try {
              const url = new URL(webResult.url);
              websites.add(url.hostname);
            } catch (e) {
              websites.add(webResult.url);
            }
          }
        }
      }
      
      // Fallback: Check citations for all providers as a secondary source
      if (result.citations && result.citations.length > 0) {
        for (const citation of result.citations) {
          if (citation.url) {
            try {
              const url = new URL(citation.url);
              websites.add(url.hostname);
            } catch (e) {
              websites.add(citation.url);
            }
          }
        }
      }
      
      // Last resort: Check tool usage for URLs in execution_details
      if (websites.size === 0 && result.toolUsage && result.toolUsage.length > 0) {
        for (const tool of result.toolUsage) {
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
  
  /**
   * Generate brand visibility data for the dashboard UI
   * @param results Array of pipeline results
   * @returns Brand visibility summary with model breakdown
   */
  private generateBrandVisibilitySummary(
    results: SpontaneousPipelineResult[],
  ): BrandVisibilitySummary {
    // Filter out results with errors
    const validResults = results.filter((r) => !r.error);
    
    if (validResults.length === 0) {
      return {
        globalMentionRate: 0,
        promptsTested: 0,
        totalRuns: 0,
        modelBreakdown: [],
      };
    }
    
    // Calculate global mention rate (same as regular summary)
    const mentionCount = validResults.filter((r) => r.mentioned).length;
    const globalMentionRate = mentionCount / validResults.length;
    
    // Get unique prompts count
    const uniquePromptIndices = new Set(validResults.map(r => r.promptIndex));
    const promptsTested = uniquePromptIndices.size;
    
    // Group results by LLM provider
    const resultsByProvider: Record<string, SpontaneousPipelineResult[]> = {};
    
    for (const result of validResults) {
      // Extract provider name without model specifics (e.g., "Anthropic/claude-3-opus" -> "Anthropic")
      // We'll use a friendly display name for the UI
      const providerParts = result.llmProvider.split('/');
      let providerName = providerParts[0].trim();
      let modelName = providerParts.length > 1 ? providerParts[1] : '';
      
      // Create friendly display names
      let displayName = '';
      
      if (providerName.includes('Anthropic')) {
        displayName = 'Claude 3';
      } else if (providerName.includes('OpenAI')) {
        displayName = modelName.toLowerCase().includes('gpt-4o') ? 'ChatGPT-4o' : 'ChatGPT';
      } else if (providerName.includes('Google')) {
        displayName = 'Gemini 1.5 Pro';
      } else if (providerName.includes('Mistral')) {
        displayName = 'Mistral Large';
      } else if (providerName.includes('Perplexity')) {
        displayName = 'Perplexity';
      } else {
        // Use the raw provider name as fallback
        displayName = providerName;
      }
      
      if (!resultsByProvider[displayName]) {
        resultsByProvider[displayName] = [];
      }
      
      resultsByProvider[displayName].push(result);
    }
    
    // Generate model breakdown
    const modelBreakdown: ModelBreakdown[] = [];
    
    for (const [name, providerResults] of Object.entries(resultsByProvider)) {
      const modelMentionCount = providerResults.filter(r => r.mentioned).length;
      const modelMentionRate = modelMentionCount / providerResults.length;
      
      // Count unique prompt indices for this model
      const modelPromptIndices = new Set(providerResults.map(r => r.promptIndex));
      
      modelBreakdown.push({
        name,
        mentionRate: modelMentionRate,
        promptsTested: modelPromptIndices.size,
        runs: providerResults.length,
      });
    }
    
    // Sort model breakdown by mention rate (highest first)
    modelBreakdown.sort((a, b) => b.mentionRate - a.mentionRate);
    
    return {
      globalMentionRate,
      promptsTested,
      totalRuns: validResults.length,
      modelBreakdown,
    };
  }
}