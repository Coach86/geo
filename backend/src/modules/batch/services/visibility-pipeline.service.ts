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

/**
 * Generate a stable, unique ID from a brand/competitor name
 * @param name The brand or competitor name
 * @returns A normalized ID string
 */
function generateBrandId(name: string): string {
  const original = name;
  const id = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
  
  // [VIS-DEDUP] Log ID generation
  console.log(`[VIS-DEDUP] generateBrandId: "${original}" -> "${id}"`);
  
  return id;
}

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
      
      // [VIS-DEDUP] Log the competitors from context
      this.logger.log(`[VIS-DEDUP] Context brand: "${context.brandName}"`);
      this.logger.log(`[VIS-DEDUP] Context competitors: ${JSON.stringify(context.competitors)}`);
      this.logger.log(`[VIS-DEDUP] Number of prompts: ${prompts.length}`);

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

    // Generate competitor objects with IDs for the prompt
    const brandWithId = { name: brandName, id: generateBrandId(brandName) };
    const competitorsWithIds = competitors.map(name => ({ 
      name, 
      id: generateBrandId(name) 
    }));

    // [VIS-DEDUP] Log the brand and competitor IDs being used
    this.logger.log(`[VIS-DEDUP] Brand with ID: ${JSON.stringify(brandWithId)}`);
    this.logger.log(`[VIS-DEDUP] Competitors with IDs: ${JSON.stringify(competitorsWithIds)}`);
    this.logger.log(`[VIS-DEDUP] Prompt index: ${promptIndex}, Run index: ${runIndex}`);

    // Define the schema for structured output
    const schema = z.object({
      topOfMind: z
        .array(z.object({
          name: z.string().describe('The brand or company name as mentioned'),
          type: z.enum(['ourbrand', 'competitor', 'other']).describe('The type of brand'),
          id: z.string().nullable().describe('The unique ID for ourbrand or competitor types (null for other type)'),
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
      brandWithId: JSON.stringify(brandWithId),
      competitors: JSON.stringify(competitorsWithIds),
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
      
      // [VIS-DEDUP] Log the raw result from LLM analysis
      this.logger.log(`[VIS-DEDUP] Raw topOfMind result: ${JSON.stringify(topOfMind)}`);
      
      // Check if the brand is mentioned by looking for 'ourbrand' type in the topOfMind list
      const mentioned = topOfMind.some(brand => brand.type === 'ourbrand');
      
      if (mentioned) {
        this.logger.log(`Brand "${brandName}" found in topOfMind list with type 'ourbrand'`);
      }
      
      // [VIS-DEDUP] Log each brand found and its ID status
      topOfMind.forEach((brand, idx) => {
        this.logger.log(`[VIS-DEDUP] Brand ${idx}: name="${brand.name}", type="${brand.type}", id="${brand.id}" (${brand.id === null ? 'null' : brand.id === undefined ? 'undefined' : 'string'})`);
      });

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
        topDomains: [],
      };
    }

    // Calculate mention rate
    const mentionCount = validResults.filter((r) => r.mentioned).length;
    const mentionRate = mentionCount / validResults.length;

    // Count top mentions using ID-based deduplication with fallback to normalized names
    const mentionsMap: Map<string, { name: string; count: number; type: string }> = new Map();
    
    // [VIS-DEDUP] Log start of aggregation
    this.logger.log(`[VIS-DEDUP] Starting aggregation for ${validResults.length} valid results`);
    
    // Count domains from citations
    const domainMap = new Map<string, number>();
    let totalCitations = 0;
    
    for (const result of validResults) {
      // Process top of mind brands
      for (const brand of result.topOfMind) {
        // [VIS-DEDUP] Log each brand being processed
        this.logger.log(`[VIS-DEDUP] Processing brand: name="${brand.name}", type="${brand.type}", id="${brand.id}" (${brand.id === null ? 'null' : brand.id === undefined ? 'undefined' : `string: "${brand.id}"`})`);
        
        // Use ID as primary key if available (and not null), otherwise fall back to normalized name
        // Convert ID to lowercase to prevent duplicates from capitalization differences
        const key = (brand.id && brand.id !== null) ? brand.id.toLowerCase() : brand.name.toLowerCase().trim();
        
        // [VIS-DEDUP] Log the key being used
        this.logger.log(`[VIS-DEDUP] Using key: "${key}" (based on ${(brand.id && brand.id !== null) ? 'ID' : 'normalized name'})`);
        
        if (!key) {
          this.logger.warn(`[VIS-DEDUP] Skipping brand with no valid key: ${JSON.stringify(brand)}`);
          continue; // Skip if no valid key
        }
        
        if (!mentionsMap.has(key)) {
          mentionsMap.set(key, {
            name: brand.name, // Use the exact name from this mention
            count: 0,
            type: brand.type,
          });
          this.logger.log(`[VIS-DEDUP] Created new entry for key "${key}" with name "${brand.name}"`);
        } else {
          // If we have an ID and this mention has the canonical name, update the stored name
          const entry = mentionsMap.get(key)!;
          if (brand.id && (brand.type === 'ourbrand' || brand.type === 'competitor')) {
            const oldName = entry.name;
            entry.name = brand.name; // Use the canonical name for ourbrand/competitor with ID
            if (oldName !== brand.name) {
              this.logger.log(`[VIS-DEDUP] Updated name for key "${key}" from "${oldName}" to "${brand.name}"`);
            }
          }
        }
        
        const entry = mentionsMap.get(key)!;
        entry.count++;
        this.logger.log(`[VIS-DEDUP] Incremented count for key "${key}" to ${entry.count}`);
        
        // Log ID-based deduplication for monitoring
        if (brand.id && brand.id !== null && brand.type !== 'other') {
          this.logger.log(`[VIS-DEDUP] SUCCESS: Using ID-based deduplication: ${brand.name} (${brand.type}) -> ${brand.id}`);
        } else if (brand.type !== 'other' && (!brand.id || brand.id === null)) {
          this.logger.warn(`[VIS-DEDUP] FALLBACK: Name-based deduplication for ${brand.type}: ${brand.name} (no ID provided)`);
        }
      }
      
      // Process citations for domain counting
      if (result.citations && Array.isArray(result.citations)) {
        for (const citation of result.citations) {
          if (citation.url || citation.website) {
            try {
              const urlString = citation.url || citation.website;
              const url = new URL(urlString);
              const domain = url.hostname.replace(/^www\./, '').toLowerCase();
              
              domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
              totalCitations++;
            } catch (e) {
              // If URL parsing fails, try to extract domain from the string
              const urlString = (citation.url || citation.website || '').toLowerCase();
              const domainMatch = urlString.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/);
              if (domainMatch) {
                const domain = domainMatch[1];
                domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
                totalCitations++;
              }
            }
          }
        }
      }
    }

    // [VIS-DEDUP] Log final map state before sorting
    this.logger.log(`[VIS-DEDUP] Final mentions map has ${mentionsMap.size} unique entries:`);
    mentionsMap.forEach((value, key) => {
      this.logger.log(`[VIS-DEDUP] Key: "${key}" -> Name: "${value.name}", Count: ${value.count}, Type: ${value.type}`);
    });
    
    // Sort by mention count and prepare data arrays
    const sortedEntries = Array.from(mentionsMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // For topMentions array, use the canonical names
    const sortedMentions = sortedEntries.map(data => data.name);
    
    // Create mention counts array for frontend
    const topMentionCounts = sortedEntries.map(data => ({
      mention: data.name,
      count: data.count,
    }));
    
    // [VIS-DEDUP] Log final sorted results
    this.logger.log(`[VIS-DEDUP] Top mention counts: ${JSON.stringify(topMentionCounts)}`);

    // Calculate top domains
    const allDomainEntries = Array.from(domainMap.entries())
      .map(([domain, count]) => ({
        domain,
        count,
        percentage: totalCitations > 0 ? Math.round((count / totalCitations) * 100 * 10) / 10 : 0, // Round to 1 decimal
      }))
      .sort((a, b) => b.count - a.count);
    
    // Get top 9 domains
    const topNineDomains = allDomainEntries.slice(0, 9);
    
    // Calculate "Others" count and percentage
    const othersCount = allDomainEntries
      .slice(9)
      .reduce((sum, item) => sum + item.count, 0);
    
    // Build final domains list
    const topDomains = [...topNineDomains];
    if (othersCount > 0) {
      topDomains.push({
        domain: 'Others',
        count: othersCount,
        percentage: totalCitations > 0 ? Math.round((othersCount / totalCitations) * 100 * 10) / 10 : 0
      });
    }

    this.logger.log(`Analyzed visibility results: ${validResults.length} valid results, ${mentionCount} mentions, ${topMentionCounts.length} unique brands`);
    if (topMentionCounts.length > 0) {
      this.logger.log(`Top mention: ${topMentionCounts[0].mention} (${topMentionCounts[0].count} times)`);
    }
    if (topDomains.length > 0) {
      this.logger.log(`Top domains: ${topDomains.slice(0, 3).map(d => `${d.domain} (${d.count})`).join(', ')}`);
    }

    return {
      mentionRate,
      topMentions: sortedMentions,
      topMentionCounts,
      topDomains,
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
