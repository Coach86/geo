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

    if (this.isAvailable() && !this.isMockMode()) {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
      });
    }
  }

  isAvailable(): boolean {
    // Only consider available if the API key is provided and not empty
    return !!this.apiKey && this.apiKey.length > 0;
  }

  private isMockMode(): boolean {
    return this.apiKey === 'mock';
  }

  async call(prompt: string, options?: LlmCallOptions): Promise<LlmResponse> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Determine the model to use (default or from options)
      const modelName = options?.model || 'gpt-4o';
      this.logger.log(`Calling OpenAI API with model: ${modelName} and key: ${this.apiKey}`);
      // The OpenAI SDK expects a specific Tool type. For web_search_preview, only 'type' is required.
      const response = await this.openai.responses.create({
        model: modelName,
        input: prompt,
        tools: [{ type: 'web_search_preview' }],
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP,
      });
      this.logger.log(`OpenAI response: ${JSON.stringify(response)}`);
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
        usedWebSearch:
          [{ type: 'web_search_preview' }].some(
            (t: { type: string }) => t.type === 'web_search_preview',
          ) || annotations.length > 0,
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
