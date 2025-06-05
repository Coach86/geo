import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmAdapter, LlmCallOptions, LlmResponse, SourceCitation, TOOL_TYPES } from '../interfaces/llm-adapter.interface';
import { xai, createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';

@Injectable()
export class GrokAdapter implements LlmAdapter {
  private readonly logger = new Logger(GrokAdapter.name);
  private readonly apiKey: string;
  name = 'Grok';
  private readonly xaiProvider: ReturnType<typeof createXai>;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GROK_API_KEY', '');
    this.xaiProvider = createXai({
      apiKey: this.apiKey,
    });
  }

  isAvailable(): boolean {
    // Only consider available if the API key is provided and not empty
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async call(prompt: string, options?: LlmCallOptions): Promise<LlmResponse> {
    if (!this.isAvailable()) {
      throw new Error('Grok API key not configured');
    }

    try {
      const model = options?.model || 'grok-3-beta';
      const temperature = options?.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? 1000;
      
      this.logger.log(`Calling Grok API with model: ${model}`);
      
      // The SDK expects a prompt (string) or messages (array). We'll use prompt for now.
      const result = await generateText({
        model: this.xaiProvider(model),
        prompt,
        temperature,
        maxTokens,
      });

      // Initialize tracking variables
      const annotations: SourceCitation[] = [];
      const toolUsage = [];
      let usedWebSearch = false;

      // Extract sources from the generateText result
      // The AI SDK provides sources directly when web search is used
      if (result.sources && result.sources.length > 0) {
        this.logger.log(`Found ${result.sources.length} sources in Grok response`);
        
        for (const source of result.sources) {
          // LanguageModelV1Source has url and title properties
          if ('url' in source && source.url) {
            annotations.push({
              url: source.url,
              title: 'title' in source && source.title ? source.title : 'Web Source',
            });
          }
        }
        
        // If we have sources, web search was likely used
        usedWebSearch = true;
        
        // Add web search to tool usage
        toolUsage.push({
          id: 'web_search_' + Date.now(),
          type: TOOL_TYPES.WEB_SEARCH,
          parameters: {},
          execution_details: {
            status: 'completed',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Check tool calls for web search usage
      if (result.toolCalls && result.toolCalls.length > 0) {
        this.logger.log(`Found ${result.toolCalls.length} tool calls in Grok response`);
        
        for (const toolCall of result.toolCalls) {
          if (toolCall.toolName === 'web_search' || toolCall.toolName === 'search') {
            usedWebSearch = true;
            
            toolUsage.push({
              id: toolCall.toolCallId || 'web_search_' + Date.now(),
              type: TOOL_TYPES.WEB_SEARCH,
              parameters: toolCall.args || {},
              execution_details: {
                status: 'completed',
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
      }

      // Check for warnings that might indicate web search issues
      if (result.warnings && result.warnings.length > 0) {
        this.logger.log(`Grok response includes warnings: ${JSON.stringify(result.warnings)}`);
      }

      // Also try to extract citations from the text itself
      // Look for common citation patterns like [1], (source: URL), etc.
      const urlRegex = /\[(?:source|citation|ref)?:?\s*(https?:\/\/[^\s\]]+)\]/gi;
      const matches = result.text.matchAll(urlRegex);
      
      for (const match of matches) {
        if (match[1]) {
          annotations.push({
            url: match[1],
            title: 'Inline Citation',
          });
        }
      }

      // Deduplicate citations by URL
      const uniqueAnnotations = this.deduplicateCitations(annotations);

      // Log citation extraction results
      if (uniqueAnnotations.length > 0) {
        this.logger.log(
          `Extracted ${uniqueAnnotations.length} unique citations from Grok response (${annotations.length} total)`,
        );
      } else if (result.text.toLowerCase().includes('search') || result.text.toLowerCase().includes('found')) {
        this.logger.log(`No citations found in Grok response, but text suggests web search may have been used`);
      }

      return {
        text: result.text,
        modelVersion: model || 'grok-3-beta',
        tokenUsage: result.usage
          ? {
              input: result.usage.promptTokens || 0,
              output: result.usage.completionTokens || 0,
              total: result.usage.totalTokens || 0,
            }
          : undefined,
        annotations: uniqueAnnotations.length > 0 ? uniqueAnnotations : undefined,
        toolUsage: toolUsage.length > 0 ? toolUsage : undefined,
        usedWebSearch: usedWebSearch || uniqueAnnotations.length > 0,
        responseMetadata: {
          sources: result.sources,
          toolCalls: result.toolCalls,
          warnings: result.warnings,
          finishReason: result.finishReason,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error calling Grok SDK: ${error.message}`);
      throw new Error(`Failed to call Grok SDK: ${error.message}`);
    }
  }

  /**
   * Deduplicate citations by URL
   */
  private deduplicateCitations(citations: SourceCitation[]): SourceCitation[] {
    const seen = new Set<string>();
    return citations.filter(citation => {
      if (seen.has(citation.url)) {
        return false;
      }
      seen.add(citation.url);
      return true;
    });
  }
}
