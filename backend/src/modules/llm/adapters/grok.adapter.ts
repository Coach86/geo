import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmAdapter, LlmCallOptions, LlmResponse, SourceCitation, TOOL_TYPES } from '../interfaces/llm-adapter.interface';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class GrokAdapter implements LlmAdapter {
  private readonly logger = new Logger(GrokAdapter.name);
  private readonly apiKey: string;
  name = 'Grok';
  private readonly httpClient: AxiosInstance;
  private readonly apiBaseUrl = 'https://api.x.ai/v1';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GROK_API_KEY', '');
    this.httpClient = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds timeout
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

      // Prepare the request payload with search_parameters for live search
      const requestPayload: any = {
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
        temperature,
        max_tokens: maxTokens,
        // Enable live search with search_parameters
        search_parameters: {
          mode: 'auto', // Let the model decide when to search
          return_citations: true, // Always return citations
          max_search_results: 10, // Default limit
        }
      };

      // Make the HTTP request
      const response = await this.httpClient.post('/chat/completions', requestPayload);
      const result = response.data;

      // Initialize tracking variables
      const annotations: SourceCitation[] = [];
      const toolUsage = [];
      let usedWebSearch = false;
      let numSourcesUsed = 0;

      // Extract the main response text
      const responseText = result.choices?.[0]?.message?.content || '';

      // Check usage for num_sources_used (indicates if search was performed)
      if (result.usage?.num_sources_used && result.usage.num_sources_used > 0) {
        usedWebSearch = true;
        numSourcesUsed = result.usage.num_sources_used;
        this.logger.log(`Grok used ${numSourcesUsed} sources for search`);
      }

      // Extract citations from the API response
      // According to docs, citations are returned as a list of URL strings
      if (result.citations && Array.isArray(result.citations)) {
        this.logger.log(`Found ${result.citations.length} citations in Grok response`);

        for (const citation of result.citations) {
          if (typeof citation === 'string') {
            // Citation is just a URL string
            annotations.push({
              url: citation,
              title: 'Web Source',
            });
          } else if (citation.url) {
            // Citation might be an object with url and title
            annotations.push({
              url: citation.url,
              title: citation.title || 'Web Source',
            });
          }
        }
      }

      // For streaming responses, citations come in the last chunk
      // Check if this is the last chunk in a stream
      if (result.choices?.[0]?.finish_reason && result.citations) {
        // Handle streaming citations if needed
        this.logger.log('Processing final chunk with citations');
      }

      // Also try to extract citations from the response text
      // Look for numbered citations like [1], [2], etc.
      const citationRegex = /\[(\d+)\]/g;
      const citationMatches = responseText.matchAll(citationRegex);
      const citationNumbers = new Set<string>();
      for (const match of citationMatches) {
        citationNumbers.add(match[1]);
      }

      // Look for citation list at the end of the response
      if (citationNumbers.size > 0) {
        // Look for patterns like "[1] Title - URL" or "1. Title URL"
        const citationListRegex = /\[?(\d+)\]?\.?\s+([^-\n]+?)(?:\s*[-–]\s*)?(https?:\/\/[^\s\n]+)/gm;
        const listMatches = responseText.matchAll(citationListRegex);

        for (const match of listMatches) {
          const [, number, title, url] = match;
          if (citationNumbers.has(number)) {
            annotations.push({
              url: url.trim(),
              title: title.trim() || `Source [${number}]`,
            });
          }
        }
      }

      // Create a tool usage entry if web search was used
      if (usedWebSearch) {
        toolUsage.push({
          id: 'live_search_' + Date.now(),
          type: TOOL_TYPES.WEB_SEARCH,
          input: {
            query: 'unknown'
          },
          parameters: {
            mode: 'auto',
            sources: ['web', 'x', 'news'],
            num_sources_used: numSourcesUsed
          },
          execution_details: {
            status: 'completed',
            timestamp: new Date().toISOString(),
            citationCount: annotations.length,
            sourcesUsed: numSourcesUsed,
          },
        });
      }

      // Deduplicate citations by URL
      const uniqueAnnotations = this.deduplicateCitations(annotations);

      // Log citation extraction results
      if (uniqueAnnotations.length > 0) {
        this.logger.log(
          `Extracted ${uniqueAnnotations.length} unique citations from Grok response (${annotations.length} total)`,
        );
      } else if (numSourcesUsed > 0) {
        this.logger.log(`Grok used ${numSourcesUsed} sources but no citations were extracted from response`);
      }

      return {
        text: responseText,
        modelVersion: model,
        tokenUsage: result.usage
          ? {
              input: result.usage.prompt_tokens || 0,
              output: result.usage.completion_tokens || 0,
              total: result.usage.total_tokens || 0,
            }
          : undefined,
        annotations: uniqueAnnotations.length > 0 ? uniqueAnnotations : undefined,
        toolUsage: toolUsage.length > 0 ? toolUsage : undefined,
        usedWebSearch: usedWebSearch || uniqueAnnotations.length > 0,
        responseMetadata: {
          model: result.model,
          created: result.created,
          system_fingerprint: result.system_fingerprint,
          finish_reason: result.choices?.[0]?.finish_reason,
          citations: result.citations,
          num_sources_used: numSourcesUsed,
          usage: result.usage,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error calling Grok API: ${error.message}`);
      if (error.response?.data) {
        this.logger.error(`API Error Response: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Failed to call Grok API: ${error.message}`);
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
