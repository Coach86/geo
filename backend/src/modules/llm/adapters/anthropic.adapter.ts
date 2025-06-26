import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmAdapter,
  LlmCallOptions,
  LlmResponse,
  TOOL_TYPES,
} from '../interfaces/llm-adapter.interface';
import Anthropic from '@anthropic-ai/sdk';
import { LlmConfigService } from '../../config/services/llm-config.service';

@Injectable()
export class AnthropicAdapter implements LlmAdapter {
  private readonly logger = new Logger(AnthropicAdapter.name);
  private readonly apiKey: string;
  private anthropic: Anthropic;
  name = 'Anthropic';

  constructor(
    private readonly configService: ConfigService,
    private readonly llmConfigService: LlmConfigService,
  ) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY', '');

    if (this.isAvailable()) {
      this.anthropic = new Anthropic({
        apiKey: this.apiKey,
      });
    }
  }

  isAvailable(): boolean {
    // Only consider available if the API key is provided and not empty
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async call(prompt: string, options?: LlmCallOptions): Promise<LlmResponse> {
    if (!this.isAvailable()) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      if (!options?.model) {
        throw new Error("Model not specified. Please specify a model using the 'model' option.")
      }
      const modelName = options?.model;
      const webAccess = options?.webAccess !== false; // Default to true if not specified

      this.logger.log(`Calling Anthropic API with configuration:`);
      this.logger.log(`- Model: ${modelName}`);
      this.logger.log(`- Web Access: ${webAccess}`);
      this.logger.log(`- Temperature: ${options?.temperature !== undefined ? options.temperature : 'not set'}`);
      this.logger.log(`- Max Tokens: ${options?.maxTokens !== undefined ? options.maxTokens : 'not set'}`);
      this.logger.log(`- Top P: ${options?.topP !== undefined ? options.topP : 'not set'}`);
      this.logger.log(`- System Prompt: ${options?.systemPrompt ? 'provided' : 'not set'}`);

      // Build the request parameters
      const requestParams: any = {
        model: modelName,
        max_tokens: options?.maxTokens ?? 1000,
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP ?? 1,
        messages: [{ role: 'user', content: prompt }],
      };

      // Only add web search tool if webAccess is enabled
      if (webAccess) {
        requestParams.tools = [
          {
            type: TOOL_TYPES.ANTHROPIC_WEB_SEARCH, // Using the constant for type consistency
            name: 'web_search',
            max_uses: this.llmConfigService.getMaxWebSearches(modelName),
          } as any, // Type assertion to bypass TypeScript error
        ];
      }

      // Create messages array with system message if provided
      const systemMessage =
        options?.systemPrompt ||
        (webAccess 
          ? "To answer the user's question, search the web when you need current information."
          : "Answer the user's question based on your training data.");
      
      requestParams.system = systemMessage;

      // Log the final request parameters being sent
      this.logger.log(`Final request parameters: ${JSON.stringify({
        model: requestParams.model,
        max_tokens: requestParams.max_tokens,
        temperature: requestParams.temperature,
        top_p: requestParams.top_p,
        tools: requestParams.tools ? 'web_search enabled' : 'no tools',
        system_prompt_length: requestParams.system?.length || 0,
        message_count: requestParams.messages?.length || 0
      })}`);

      // Call the Anthropic API directly
      const response = await this.anthropic.messages.create(requestParams);

      // Extract the full response content for detailed processing
      // We will keep track of components and build a coherent text response
      let fullText = '';
      const citations = [];
      const toolUsage = [];
      let usedWebSearch = false;

      // Store web search results for reference
      const webSearchResults: Record<string, { url: string; title: string; age?: string }> = {};

      // Process each content block in order
      for (const block of response.content) {
        // Text blocks add to the full response text
        if (block.type === 'text') {
          fullText += block.text;

          // Check for citations within the text block
          if (block.citations && Array.isArray(block.citations)) {
            // Add any citations found in this text block
            for (const citation of block.citations) {
              this.logger.log(`Found citation: ${JSON.stringify(citation)}`);

              // Create minimal citation object with just essential fields
              citations.push({
                url: (citation as any).url || '',
                title: (citation as any).title || 'Web Source',
              });
            }
          }
        }

        // Server tool use blocks are tracked as tool usage
        else if (block.type === 'server_tool_use') {
          if (block.name === 'web_search') {
            usedWebSearch = true;

            // Add to tool usage tracking - minimal fields only
            const toolCall = {
              id: block.id,
              type: TOOL_TYPES.WEB_SEARCH, // Standardized type for storage
              parameters: block.input || {},
              execution_details: {
                status: 'completed',
                timestamp: new Date().toISOString(),
              },
            };

            toolUsage.push(toolCall);

            // Add context text about the search
            const queryText =
              block.input && typeof block.input === 'object' && 'query' in block.input
                ? (block.input as any).query
                : 'information';
            fullText += `\n[Searching for: ${queryText}]\n`;
          }
        }

        // Web search results blocks contain the sources
        else if (block.type === 'web_search_tool_result') {
          // Track the result for linking with citations later
          if (block.content && Array.isArray(block.content)) {
            for (const result of block.content) {
              if (result.type === 'web_search_result') {
                webSearchResults[result.url] = {
                  url: result.url,
                  title: result.title,
                  age: result.page_age || undefined,
                };

                // Log the search result for debugging
                this.logger.log(`Web search result: ${result.title} (${result.url})`);
              }
            }
          }
        }
      }

      // Log web search activity if detected
      if (usedWebSearch) {
        this.logger.log(
          `Web search was used in the Anthropic response with ${Object.keys(webSearchResults).length} results`,
        );
        if (citations.length > 0) {
          this.logger.log(`Found ${citations.length} citations in Anthropic response`);
        }

        // Log the specific search queries
        toolUsage.forEach((tool) => {
          const query = (tool.parameters as any)?.query || 'unknown query';
          this.logger.log(`Web search query: "${query}"`);
        });
      }

      // Log tool usage information
      if (usedWebSearch) {
        this.logger.log(`Web search was used in the Anthropic response`);

        // Log the specific search queries
        toolUsage.forEach((tool) => {
          const query = (tool.parameters as any)?.query || 'unknown query';
          this.logger.log(`Web search query: "${query}"`);
        });
      }

      // Format usage stats
      const usage = {
        input_tokens: response.usage?.input_tokens || 0,
        output_tokens: response.usage?.output_tokens || 0,
        web_search_requests: response.usage?.server_tool_use?.web_search_requests || 0,
      };

      // Deduplicate citations by URL
      const uniqueCitations = this.deduplicateCitations(citations);

      if (citations.length !== uniqueCitations.length) {
        this.logger.log(
          `Deduplicated ${citations.length - uniqueCitations.length} duplicate citations`,
        );
      }

      // Format and return the result
      return {
        text: fullText,
        modelVersion: modelName,
        tokenUsage: {
          input: usage.input_tokens,
          output: usage.output_tokens,
          total: usage.input_tokens + usage.output_tokens,
        },
        annotations: uniqueCitations.length > 0 ? uniqueCitations : undefined,
        toolUsage: toolUsage,
        usedWebSearch,
        responseMetadata: {
          id: response.id,
          model: response.model,
          role: response.role,
          stop_reason: response.stop_reason,
          stop_sequence: response.stop_sequence,
          usage: response.usage,
          raw_content_types: response.content.map((block) => block.type),
          webSearchResults: Object.values(webSearchResults),
        },
      };
    } catch (error) {
      this.logger.error(`Error calling Anthropic API: ${error.message}`);
      throw new Error(`Failed to call Anthropic API: ${error.message}`);
    }
  }

  /**
   * This adapter doesn't implement structured output directly.
   * Use AnthropicLangChainAdapter for structured outputs.
   */
  async getStructuredOutput<T>(): Promise<T> {
    throw new Error(
      'This Anthropic direct SDK adapter does not support structured output. Use AnthropicLangChainAdapter instead.',
    );
  }

  /**
   * Deduplicates an array of citations based on URL
   * @param citations The array of citations to deduplicate
   * @returns A new array with duplicates removed
   */
  private deduplicateCitations(
    citations: Array<{ url: string; title: string; text?: string }>,
  ): Array<{ url: string; title: string; text?: string }> {
    const uniqueUrls = new Map<string, { url: string; title: string; text?: string }>();

    // Keep only the first occurrence of each URL
    for (const citation of citations) {
      if (citation.url && !uniqueUrls.has(citation.url)) {
        uniqueUrls.set(citation.url, citation);
      }
    }

    return Array.from(uniqueUrls.values());
  }
}
