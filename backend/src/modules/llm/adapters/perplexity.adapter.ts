import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatPerplexity } from '@langchain/community/chat_models/perplexity';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';

@Injectable()
export class PerplexityAdapter implements LlmAdapter {
  private readonly logger = new Logger(PerplexityAdapter.name);
  private readonly apiKey: string;
  name = 'Perplexity';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('PERPLEXITY_API_KEY', '');
  }

  isAvailable(): boolean {
    // Only consider available if the API key is provided and not empty
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async call(prompt: string, options?: LlmCallOptions): Promise<LlmResponse> {
    if (!this.isAvailable()) {
      throw new Error('Perplexity API key not configured');
    }

    try {
      // Default model is Sonar-Medium-Online
      const model = options?.model || 'sonar-medium-online';

      const chatModel = new ChatPerplexity({
        apiKey: this.apiKey,
        model: model,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens,
        //  topP: options?.topP,
        // timeout: options?.timeout ?? 30000,
      });

      const messages = [];
      if (options?.systemPrompt) {
        messages.push(new SystemMessage(options.systemPrompt));
      }
      messages.push(new HumanMessage(prompt));

      const response = await chatModel.invoke(messages);

      // Get token usage if available
      const usage = (chatModel as any).lastUsage || {};

      // Perplexity always uses web search by design
      // Extract any URLs or citations from the response
      // This is an estimation since Perplexity-specific citation extraction
      // is not directly accessible through LangChain
      const usedWebSearch = true;
      const citations: Array<{ type: string; url: string; title: string; text: string }> = [];
      const toolUsage: Array<{
        id: string;
        type: string;
        parameters: any;
        execution_details: any;
      }> = [];

      // Extract text from response
      const text = response.content.toString();

      // Perplexity returns citations in a specific format in the raw response
      // We need to check both the _raw property and direct properties that may contain citations
      const uniqueUrls: string[] = [];

      // Get the raw response data
      const raw = (response as any)._raw || {};

      // Check for direct citations array in response metadata
      // This is the primary source in the latest Perplexity API
      const directCitations = raw.citations || (response as any).additional_kwargs?.citations || [];
      if (Array.isArray(directCitations) && directCitations.length > 0) {
        this.logger.log(`Found ${directCitations.length} direct citations in Perplexity response`);
        for (const url of directCitations) {
          if (typeof url === 'string' && url.startsWith('http') && !uniqueUrls.includes(url)) {
            uniqueUrls.push(url);
          }
        }
      }

      // If we found direct citations, we're done
      // Otherwise, fall back to other metadata sources
      if (uniqueUrls.length === 0) {
        // Check for legacy source URLs in _raw metadata
        const sources = raw.web_search_results || raw.sources || [];

        // Extract URLs from sources metadata
        if (Array.isArray(sources) && sources.length > 0) {
          for (const source of sources) {
            if (source.url && !uniqueUrls.includes(source.url)) {
              uniqueUrls.push(source.url);
            }
          }
        }

        // If still no URLs were found, fall back to extracting from text
        // This is the least accurate approach but provides some data when all else fails
        if (uniqueUrls.length === 0) {
          const urlRegex = /\b(https?:\/\/[\w\.-]+\.[a-z]{2,}[\w\.\/\-\?\=\&\%]*)/gi;
          const urls = text.match(urlRegex) || [];
          for (const url of urls) {
            if (!uniqueUrls.includes(url)) {
              uniqueUrls.push(url);
            }
          }
        }
      }
      // Process each unique URL - keep it minimal without complex parsing
      uniqueUrls.forEach((url) => {
        // Create a minimal citation with just the URL - simple and direct
        citations.push({
          type: 'web_page',
          url: url,
          title: 'Web Source',
          text: 'No text available',
        });

        // Also track as tool usage - with minimal required fields only
        toolUsage.push({
          id: `perplexity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: 'web_search',
          parameters: { query: 'automatic' },
          execution_details: {
            status: 'completed',
            timestamp: new Date().toISOString(),
          },
        });
      });

      // Check for additional metadata from the response
      const responseMetadata = (response as any)._raw || {};

      // Log search activity
      if (uniqueUrls.length > 0) {
        this.logger.log(
          `Perplexity search found ${uniqueUrls.length} URLs: ${uniqueUrls.slice(0, 3).join(', ')}${uniqueUrls.length > 3 ? '...' : ''}`,
        );
      }
      
      // Deduplicate citations by URL
      const uniqueCitations = this.deduplicateCitations(citations);
      
      if (citations.length !== uniqueCitations.length) {
        this.logger.log(`Deduplicated ${citations.length - uniqueCitations.length} duplicate citations`);
      }

      return {
        text: text,
        modelVersion: model,
        tokenUsage: {
          input: usage.promptTokens || 0,
          output: usage.completionTokens || 0,
          total: usage.totalTokens || 0,
        },
        annotations: uniqueCitations.length > 0 ? uniqueCitations : undefined,
        toolUsage: toolUsage,
        usedWebSearch: usedWebSearch,
        responseMetadata: {
          model: model,
          ...responseMetadata,
          webSearchResults: uniqueUrls.map((url) => ({
            url,
            title: url.split('/').slice(2).join('/').split('?')[0] || 'Web Source',
          })),
        },
      };
    } catch (error) {
      this.logger.error(`Error calling Perplexity API: ${error.message}`);
      throw new Error(`Failed to call Perplexity API: ${error.message}`);
    }
  }
  
  /**
   * Deduplicates an array of citations based on URL
   * @param citations The array of citations to deduplicate
   * @returns A new array with duplicates removed
   */
  private deduplicateCitations(citations: Array<{ url: string; title: string; text: string; type: string }>): Array<{ url: string; title: string; text: string; type: string }> {
    const uniqueUrls = new Map<string, { url: string; title: string; text: string; type: string }>();
    
    // Keep only the first occurrence of each URL
    for (const citation of citations) {
      if (citation.url && !uniqueUrls.has(citation.url)) {
        uniqueUrls.set(citation.url, citation);
      }
    }
    
    return Array.from(uniqueUrls.values());
  }
}
