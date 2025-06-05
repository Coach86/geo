import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';
import { ZodSchema } from 'zod';
import { SourceCitation } from '../interfaces/llm-adapter.interface';

@Injectable()
export class OpenAiAdapter implements LlmAdapter {
  private readonly logger = new Logger(OpenAiAdapter.name);
  private readonly apiKey: string;
  private openai: OpenAI;
  name = 'OpenAI';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY', '');

    if (this.isAvailable()) {
      this.logger.log(`OpenAI API key found, initializing OpenAI client...`);
      this.openai = new OpenAI({
        apiKey: this.apiKey,
      });
      
      // Log adapter configuration
      this.logger.log(`OpenAI adapter initialized with configuration:`);
      this.logger.log(`- API Key: ${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
      this.logger.log(`- Provider: ${this.name}`);
      this.logger.log(`- Available: ${this.isAvailable()}`);
    } else {
      this.logger.warn(`OpenAI adapter not available - API key not configured`);
    }
  }

  isAvailable(): boolean {
    // Only consider available if the API key is provided and not empty
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async call(prompt: string, options?: LlmCallOptions): Promise<LlmResponse> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      if (!options?.model) {
        throw new Error("Model not specified. Please specify a model using the 'model' option.")
      }
      const modelName = options?.model;
      const webAccess = options?.webAccess !== false; // Default to true if not specified
      
      this.logger.log(`Calling OpenAI API with configuration:`);
      this.logger.log(`- Model: ${modelName}`);
      this.logger.log(`- Web Access: ${webAccess}`);
      this.logger.log(`- Temperature: ${options?.temperature !== undefined ? options.temperature : 'not set'}`);
      this.logger.log(`- Max Tokens: ${options?.maxTokens !== undefined ? options.maxTokens : 'not set'}`);
      this.logger.log(`- Top P: ${options?.topP !== undefined ? options.topP : 'not set'}`);
      this.logger.log(`- System Prompt: ${options?.systemPrompt ? 'provided' : 'not set'}`);
      
      // Build the request parameters
      const requestParams: any = {
        model: modelName,
        input: prompt,
      };
      
      // Only add temperature if explicitly provided
      if (options?.temperature !== undefined) {
        requestParams.temperature = options.temperature;
      }
      
      // Only add top_p if explicitly provided
      if (options?.topP !== undefined) {
        requestParams.top_p = options.topP;
      }
      
      // Only add web search tool if webAccess is enabled
      if (webAccess) {
        requestParams.tools = [{ type: 'web_search_preview' }];
      }
      
      // Log the final request parameters being sent
      this.logger.log(`Final request parameters: ${JSON.stringify({
        model: requestParams.model,
        temperature: requestParams.temperature,
        top_p: requestParams.top_p,
        tools: requestParams.tools ? 'web_search_preview' : 'none',
        input_length: requestParams.input?.length || 0
      })}`);
      
      // The OpenAI SDK expects a specific Tool type. For web_search_preview, only 'type' is required.
      const response = await this.openai.responses.create(requestParams);
      // The OpenAI responses.create returns an array of events/objects.
      // We need to extract URLs from url_citation annotations in output_text content.
      let text = '';
      const annotations: SourceCitation[] = [];
      if (Array.isArray(response.output)) {
        for (const item of response.output) {
          if (item.type === 'message' && Array.isArray(item.content)) {
            for (const contentItem of item.content) {
              if (contentItem.type === 'output_text' && Array.isArray(contentItem.annotations)) {
                for (const annotation of contentItem.annotations) {
                  if (annotation.type === 'url_citation' && annotation.url) {
                    annotations.push({ url: annotation.url });
                  }
                }
                // Optionally, get the text from the first output_text
                if (!text && typeof contentItem.text === 'string') {
                  text = contentItem.text;
                }
              }
            }
          }
        }
      } else {
        // Fallback: if not an array, try to get output_text
        text = response.output_text || '';
      }
      // Defensive: usage may not have prompt_tokens, completion_tokens, total_tokens
      const usage = {
        input: (response.usage && response.usage.input_tokens) || 0,
        output: (response.usage && response.usage.output_tokens) || 0,
        total: (response.usage && response.usage.total_tokens) || 0,
      };

      // Deduplicate annotations by URL
      const uniqueAnnotations = this.deduplicateCitations(annotations);

      // Log the extracted citations
      if (uniqueAnnotations.length > 0) {
        this.logger.log(
          `Extracted ${uniqueAnnotations.length} unique citations from OpenAI response (${annotations.length} total)`,
        );
      }

      return {
        text,
        modelVersion: modelName,
        tokenUsage: usage,
        annotations: annotations.length > 0 ? this.deduplicateCitations(annotations) : undefined,
        usedWebSearch: webAccess && annotations.length > 0,
      };
    } catch (error) {
      this.logger.error(`Error calling OpenAI API: ${error.message}`);
      throw new Error(`Failed to call OpenAI API: ${error.message}`);
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
    throw new Error('OpenAI adapter does not support structured output');
  }

  /**
   * Deduplicates an array of citations based on URL
   * @param citations The array of citations to deduplicate
   * @returns A new array with duplicates removed
   */
  private deduplicateCitations(citations: SourceCitation[]): SourceCitation[] {
    const uniqueUrls = new Map<string, SourceCitation>();

    // Keep only the first occurrence of each URL
    for (const citation of citations) {
      if (citation.url && !uniqueUrls.has(citation.url)) {
        uniqueUrls.set(citation.url, citation);
      }
    }

    return Array.from(uniqueUrls.values());
  }
}
