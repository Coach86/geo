import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import { RawResponseService } from './raw-response.service';
import {
  BrandVisibilitySummary,
  ProjectBatchContext,
  ModelBreakdown,
  VisibilityPipelineResult,
  VisibilityResults,
  WebSearchSummary,
  TopOfMindBrand,
} from '../interfaces/batch.interfaces';
import { AnalyzerConfig, LlmModelConfig, PipelineType, PromptType } from '../interfaces/llm.interfaces';
import { BasePipelineService } from './base-pipeline.service';
import { SystemPrompts, PromptTemplates, formatPrompt } from '../prompts/prompts';
import { LlmProvider } from 'src/modules/llm/interfaces/llm-provider.enum';

@Injectable()
export class VisibilityPipelineService extends BasePipelineService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly llmService: LlmService,
    protected readonly rawResponseService?: RawResponseService,
  ) {
    super(
      configService,
      llmService,
      VisibilityPipelineService.name,
      PipelineType.VISIBILITY,
      rawResponseService,
    );
  }

  /**
   * Get analyzer config for this specific pipeline
   */
  protected getAnalyzerConfig(): AnalyzerConfig {
    return this.config.analyzerConfig.visibility;
  }

  /**
   * Run the visibility pipeline for a company
   * @param context Company batch context
   * @returns Pipeline results
   */
  async run(context: ProjectBatchContext): Promise<VisibilityResults> {
    this.logger.log(`Running visibility pipeline for ${context.projectId} (${context.brandName})`);

    try {
      // Get the prompts for this pipeline
      const prompts = context.promptSet?.visibility || [];
      
      if (!prompts.length) {
        throw new Error('No visibility prompts found for this company');
      }

      // Get the enabled LLM models from configuration
      let modelsToUse = this.config.llmModels.filter((model) => model.enabled);

      // If the context has selected models, filter to only use those
      if (context.selectedModels && context.selectedModels.length > 0) {
        modelsToUse = modelsToUse.filter((model) => context.selectedModels!.includes(model.id));
        this.logger.log(`Using user-selected models: ${context.selectedModels.join(', ')}`);
      } else {
        this.logger.log(`Using all enabled models from configuration`);
      }

      if (modelsToUse.length === 0) {
        throw new Error('No models available to run - either no enabled models found in configuration or user has no selected models');
      }

      // Get the number of runs per model from config (default to 1 if not specified)
      const runsPerModel = this.getAnalyzerConfig().runsPerModel || 1;
      this.logger.log(`Running each model ${runsPerModel} times per prompt`);

      // Create tasks for each model and prompt, running each multiple times
      const tasks = [];

      for (const modelConfig of modelsToUse) {
        for (let i = 0; i < prompts.length; i++) {
          // Run each model/prompt combination multiple times based on config
          for (let runIndex = 0; runIndex < runsPerModel; runIndex++) {
            tasks.push(
              this.limiter(async () => {
                try {
                  this.logger.log(
                    `Executing run ${runIndex + 1}/${runsPerModel} for ${modelConfig.provider}/${modelConfig.model} with prompt ${i + 1}`,
                  );

                  // Step 1: Execute the prompt with this model
                  const llmResponse = await this.executePrompt(
                    modelConfig,
                    prompts[i],
                    context.batchExecutionId, // Pass batch execution ID for storing raw responses
                    i, // Pass prompt index
                  );

                  // Step 2: Analyze the response
                  return await this.analyzeResponse(
                    modelConfig,
                    context.brandName,
                    context.competitors,
                    prompts[i],
                    llmResponse,
                    i,
                    runIndex, // Pass the run index for tracking
                  );
                } catch (error) {
                  this.logger.error(
                    `Error in visibility pipeline for ${context.brandName} with ${modelConfig.provider}/${modelConfig.model} on prompt ${i}, run ${runIndex + 1}: ${error.message}`,
                    error.stack,
                  );
                  return {
                    llmProvider: modelConfig.provider,
                    llmModel: modelConfig.model,
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
      const summary = this.analyzeVisibilityResults(results);

      // Generate web search summary
      const webSearchSummary = this.createWebSearchSummary(results);

      // Generate brand visibility summary for the UI dashboard
      const brandVisibility = this.generateBrandVisibilitySummary(results);

      this.logger.log(
        `Completed visibility pipeline for ${context.projectId} with ${results.length} results`,
      );

      if (webSearchSummary.usedWebSearch) {
        this.logger.log(
          `Web search was used in ${webSearchSummary.webSearchCount} responses with ${webSearchSummary.consultedWebsites.length} websites consulted`,
        );
      }

      this.logger.log(
        `Brand visibility: ${(brandVisibility.globalMentionRate * 100).toFixed(1)}% across ${brandVisibility.promptsTested} prompts and ${brandVisibility.modelBreakdown.length} models`,
      );

      return {
        results,
        summary,
        webSearchSummary,
        brandVisibility,
      };
    } catch (error) {
      this.logger.error(
        `Failed to run visibility pipeline for ${context.projectId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Analyze the LLM response to determine if the brand was mentioned
   * @param modelConfig The LLM model configuration that generated the response
   * @param brandName The company brand name
   * @param competitors The list of competitors
   * @param prompt The original prompt
   * @param llmResponse The response from the LLM
   * @param promptIndex The index of the prompt
   * @param runIndex The index of the run for this model/prompt combination
   * @returns Analysis of the LLM response
   */
  private async analyzeResponse(
    modelConfig: LlmModelConfig,
    brandName: string,
    competitors: string[],
    prompt: string,
    llmResponseObj: any, // Changed to accept the full response object
    promptIndex: number,
    runIndex: number = 0, // Default to 0 for backward compatibility
  ): Promise<VisibilityPipelineResult> {
    this.logger.log(
      `Analyzing response from ${modelConfig.provider}/${modelConfig.model} for visibility mention of ${brandName}`,
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
      topOfMind: z
        .array(z.object({
          name: z.string().describe('The brand or company name as mentioned'),
          type: z.enum(['ourbrand', 'competitor', 'other']).describe('The type of brand'),
        }))
        .describe(
          'List of top-of-mind brands or companies mentioned with their types, empty if no brand was mentioned',
        )
        .nullable()
        .default([]),
    });

    // Format the user prompt using the template
    const userPrompt = formatPrompt(PromptTemplates.VISIBILITY_ANALYSIS, {
      originalPrompt: prompt,
      brandName,
      competitors: JSON.stringify(competitors),
      llmResponse,
    });

    try {
      // Use the base class method for structured analysis with fallback
      const result = await this.getStructuredAnalysis(
        userPrompt,
        schema,
        SystemPrompts.VISIBILITY_ANALYSIS,
        llmResponseObj.batchExecutionId, // Pass the batch execution ID if available
        promptIndex, // Pass the prompt index
        PromptType.VISIBILITY, // Pass the prompt type
        prompt, // Pass the original prompt
        llmResponse, // Pass the original LLM response
        modelConfig.model, // Pass the original LLM model
      );

      // Safe access to topOfMind with fallback to empty array
      const topOfMind = result.topOfMind || [];
      
      // Check if the brand is mentioned by looking for 'ourbrand' type in the topOfMind list
      const mentioned = topOfMind.some(brand => brand.type === 'ourbrand');
      
      if (mentioned) {
        this.logger.log(`Brand "${brandName}" found in topOfMind list with type 'ourbrand'`);
      }

      return {
        llmProvider: modelConfig.provider,
        llmModel: modelConfig.model,
        promptIndex,
        runIndex, // Include the run index in the result
        mentioned,
        topOfMind,
        originalPrompt: prompt,
        llmResponse,
        // Include web search and citation information if available
        usedWebSearch: metadata.usedWebSearch || false,
        citations: metadata.annotations || [],
        toolUsage: metadata.toolUsage || [],
        // Include the full LLM response object for provider-specific metadata extraction
        llmResponseObj: llmResponseObj,
      };
    } catch (error) {
      this.logger.error(`All analyzers failed for visibility analysis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze and summarize the results of the visibility pipeline
   * @param results Array of pipeline results
   * @returns Summary statistics
   */
  /**
   * Create a summary of web search usage in the results
   * @param results Array of pipeline results
   * @returns Web search summary
   */
  private createWebSearchSummary(results: VisibilityPipelineResult[]): WebSearchSummary {
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
      // First check for structured URLs in responseMetadata which is the most reliable source
      const llmResponseObj = result.llmResponseObj || {};
      const metadata = llmResponseObj.metadata || llmResponseObj.responseMetadata || {};

      // Extract websites based on LLM provider format
      // Anthropic: Look for web_search_tool_result in content blocks
      if (result.llmProvider === LlmProvider.Anthropic) {
        // Check if we have the full response object with content blocks
        const content = metadata.responseMetadata?.content || metadata.content || [];
        for (const block of content) {
          if (block.type === 'web_search_tool_result' && block.content) {
            for (const webResult of block.content) {
              if (webResult.type === 'web_search_result' && webResult.url) {
                try {
                  const url = new URL(webResult.url);
                  processDomain(url.hostname);
                } catch (e) {
                  // If URL parsing fails, just use the raw URL
                  processDomain(webResult.url);
                }
              }
            }
          }
        }
      }

      // OpenAI: Check for webSearchResults in responseMetadata
      if (result.llmProvider === LlmProvider.OpenAI) {
        const webSearchResults = metadata.webSearchResults || [];
        for (const webResult of webSearchResults) {
          if (webResult.url) {
            try {
              const url = new URL(webResult.url);
              processDomain(url.hostname);
            } catch (e) {
              processDomain(webResult.url);
            }
          }
        }
      }

      // Perplexity: Always uses web search, check for webSearchResults in metadata
      if (result.llmProvider === LlmProvider.Perplexity) {
        const webSearchResults = metadata.webSearchResults || [];
        for (const webResult of webSearchResults) {
          if (webResult.url) {
            try {
              const url = new URL(webResult.url);
              processDomain(url.hostname);
            } catch (e) {
              processDomain(webResult.url);
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
              processDomain(url.hostname);
            } catch (e) {
              processDomain(citation.url);
            }
          }
        }
      }

      // Last resort: Check tool usage for URLs in execution_details
      if (websiteCounts.size === 0 && result.toolUsage && result.toolUsage.length > 0) {
        for (const tool of result.toolUsage) {
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

  private analyzeVisibilityResults(
    results: VisibilityPipelineResult[],
  ): VisibilityResults['summary'] {
    // Filter out results with errors
    const validResults = results.filter((r) => !r.error);

    if (validResults.length === 0) {
      return {
        mentionRate: 0,
        topMentions: [],
        topMentionCounts: [],
      };
    }

    // Calculate mention rate
    const mentionCount = validResults.filter((r) => r.mentioned).length;
    const mentionRate = mentionCount / validResults.length;

    // Count top mentions - track both normalized and original versions
    const mentionsMap: Map<string, { originalNames: Set<string>; count: number; type: string }> = new Map();
    
    for (const result of validResults) {
      for (const brand of result.topOfMind) {
        // Normalize for matching but preserve original for display
        const normalizedBrand = brand.name.toLowerCase().trim();
        
        if (!mentionsMap.has(normalizedBrand)) {
          mentionsMap.set(normalizedBrand, {
            originalNames: new Set(),
            count: 0,
            type: brand.type,
          });
        }
        
        const entry = mentionsMap.get(normalizedBrand)!;
        entry.originalNames.add(brand.name);
        entry.count++;
      }
    }

    // Sort by mention count and prepare data arrays
    const sortedEntries = Array.from(mentionsMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
    
    // For topMentions array, use the most common original form
    const sortedMentions = sortedEntries.map(([normalizedBrand, data]) => {
      // Pick the most frequently occurring original form
      const originalFormsArray = Array.from(data.originalNames);
      return originalFormsArray[0]; // Use first original form (could be enhanced to pick most common)
    });
    
    // Create mention counts array for frontend with proper casing
    const topMentionCounts = sortedEntries.map(([normalizedBrand, data]) => {
      // Pick the most frequently occurring original form for display
      const originalFormsArray = Array.from(data.originalNames);
      const displayName = originalFormsArray[0]; // Use first original form
      
      return {
        mention: displayName,
        count: data.count,
      };
    });

    this.logger.log(`Analyzed visibility results: ${validResults.length} valid results, ${mentionCount} mentions, ${topMentionCounts.length} unique brands`);
    if (topMentionCounts.length > 0) {
      this.logger.log(`Top mention: ${topMentionCounts[0].mention} (${topMentionCounts[0].count} times)`);
    }

    return {
      mentionRate,
      topMentions: sortedMentions,
      topMentionCounts,
    };
  }

  /**
   * Generate brand visibility data for the dashboard UI
   * @param results Array of pipeline results
   * @returns Brand visibility summary with model breakdown
   */
  private generateBrandVisibilitySummary(
    results: VisibilityPipelineResult[],
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
    const uniquePromptIndices = new Set(validResults.map((r) => r.promptIndex));
    const promptsTested = uniquePromptIndices.size;

    // Group results by LLM provider
    const resultsByProvider: Record<string, VisibilityPipelineResult[]> = {};

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
      const modelMentionCount = providerResults.filter((r) => r.mentioned).length;
      const modelMentionRate = modelMentionCount / providerResults.length;

      // Count unique prompt indices for this model
      const modelPromptIndices = new Set(providerResults.map((r) => r.promptIndex));

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
