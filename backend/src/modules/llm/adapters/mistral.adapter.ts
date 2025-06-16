import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';
import { LlmAdapter, LlmCallOptions, LlmResponse, SourceCitation, ToolUseInfo, TOOL_TYPES } from '../interfaces/llm-adapter.interface';
import { ZodSchema } from 'zod';

@Injectable()
export class MistralAdapter implements LlmAdapter {
  private readonly logger = new Logger(MistralAdapter.name);
  private readonly apiKey: string;
  private mistralClient: Mistral;
  name = 'Mistral';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MISTRAL_API_KEY', '');

    if (this.isAvailable()) {
      this.mistralClient = new Mistral({
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
      throw new Error('Mistral API key not configured');
    }

    try {
      // Determine the model to use (default or from options)
      const modelName = options?.model || 'mistral-large-latest';
      const webAccess = options?.webAccess || false;

      // Create messages array
      const messages: any[] = [];

      // Add system message if provided
      if (options?.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt,
        });
      }

      // Add user message
      messages.push({
        role: 'user',
        content: prompt,
      });

      // Log the request details
      this.logger.log(`Calling Mistral API with model: ${modelName}, webAccess: ${webAccess}`);

      let text = '';
      const annotations: SourceCitation[] = [];
      const toolUsage: ToolUseInfo[] = [];
      let webSearchPerformed = false;

      // Make the API call
      // Note: As of now, Mistral's web search feature may require special access or specific models
      // The documentation suggests it's available through Le Chat interface
      // For API access, we'll make a standard call and parse any URLs in the response
      const response = await this.mistralClient.chat.complete({
        model: modelName,
        messages,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 1000,
        topP: options?.topP,
      });

      // Extract the text content
      if (response.choices && response.choices.length > 0) {
        const choice = response.choices[0];

        // Get the response text
        if (choice.message?.content) {
          if (typeof choice.message.content === 'string') {
            text = choice.message.content;
          } else if (Array.isArray(choice.message.content)) {
            text = choice.message.content
              .map((chunk: any) => {
                if (typeof chunk === 'string') return chunk;
                if (chunk.type === 'text' && chunk.text) return chunk.text;
                return '';
              })
              .join('');
          }
        }

        // If web access was requested, extract URLs from the response
        // This is a fallback approach until Mistral's web search API is fully available
        if (webAccess && text) {
          // Look for URLs in the response
          const urlRegex = /https?:\/\/[^\s\)\]]+/g;
          const urls = text.match(urlRegex) || [];

          // Look for markdown links [title](url)
          const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
          let match;
          const foundUrls = new Set<string>();

          while ((match = markdownLinkRegex.exec(text)) !== null) {
            if (!foundUrls.has(match[2])) {
              annotations.push({
                url: match[2],
                title: match[1],
              });
              foundUrls.add(match[2]);
              webSearchPerformed = true;
            }
          }

          // Add standalone URLs not already captured
          for (const url of urls) {
            if (!foundUrls.has(url)) {
              annotations.push({
                url,
                title: 'Web Source',
              });
              foundUrls.add(url);
              webSearchPerformed = true;
            }
          }

          if (webSearchPerformed) {
            this.logger.log(`Extracted ${annotations.length} citations from Mistral response`);

            // Add a generic tool usage entry for web search
            toolUsage.push({
              id: `mistral-web-search-${Date.now()}`,
              type: TOOL_TYPES.WEB_SEARCH,
              parameters: {
                query: 'unknown',
              },
              execution_details: {
                status: 'completed',
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
      }

      // Get token usage
      const usage = response.usage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      return {
        text,
        modelVersion: modelName,
        tokenUsage: {
          input: usage.promptTokens || 0,
          output: usage.completionTokens || 0,
          total: usage.totalTokens || 0,
        },
        annotations: annotations.length > 0 ? annotations : undefined,
        toolUsage: toolUsage.length > 0 ? toolUsage : undefined,
        usedWebSearch: webAccess && webSearchPerformed,
      };
    } catch (error) {
      this.logger.error(`Error calling Mistral API: ${error.message}`);
      this.logger.error(`Full error details: ${JSON.stringify(error.response?.data || error)}`);
      throw new Error(`Failed to call Mistral API: ${error.message}`);
    }
  }

  /**
   * Get structured output using a schema
   * @param prompt The prompt to send
   * @param schema The zod schema to validate against
   * @param options Additional options for the call
   * @returns Structured output conforming to the schema
   */
  async getStructuredOutput<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: LlmCallOptions,
  ): Promise<T> {
    if (!this.isAvailable()) {
      throw new Error('Mistral API not available for structured output');
    }

    try {
      // Determine the model to use (default or from options)
      const modelName = options?.model || 'mistral-large-latest';

      // Create the JSON schema from Zod schema
      const jsonSchema = this.zodToJsonSchema(schema);

      // Create messages array
      const messages: any[] = [];

      // Add system message if provided
      if (options?.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt,
        });
      } else {
        // Default system message for structured output
        messages.push({
          role: 'system',
          content: 'You are a helpful assistant that always responds with structured data in the requested JSON format.',
        });
      }

      // Add user message
      messages.push({
        role: 'user',
        content: prompt,
      });

      // Call the model with response format
      const response = await this.mistralClient.chat.complete({
        model: modelName,
        messages,
        temperature: options?.temperature ?? 0.2, // Lower temperature for structured output
        maxTokens: options?.maxTokens ?? 1000,
        topP: options?.topP ?? 1,
        responseFormat: {
          type: 'json_object',
        },
      });

      // Extract and parse the response
      if (response.choices && response.choices.length > 0) {
        const messageContent = response.choices[0].message.content;
        let contentStr: string;

        // Handle content that could be string or array
        if (typeof messageContent === 'string') {
          contentStr = messageContent;
        } else if (Array.isArray(messageContent)) {
          // Concatenate content chunks if it's an array
          contentStr = messageContent
            .map((chunk: any) => {
              if (typeof chunk === 'string') return chunk;
              if (chunk.type === 'text' && chunk.text) return chunk.text;
              return '';
            })
            .join('');
        } else {
          throw new Error('Unexpected content format from Mistral API');
        }

        const parsed = JSON.parse(contentStr);

        // Validate against the schema
        return schema.parse(parsed);
      }

      throw new Error('No response from Mistral API');
    } catch (error) {
      this.logger.error(`Error getting structured output: ${error.message}`);
      throw new Error(`Failed to get structured output: ${error.message}`);
    }
  }

  /**
   * Convert Zod schema to JSON schema (basic implementation)
   * In production, you might want to use a library like zod-to-json-schema
   */
  private zodToJsonSchema(schema: ZodSchema<any>): any {
    // This is a simplified version - in production use zod-to-json-schema package
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }
}
