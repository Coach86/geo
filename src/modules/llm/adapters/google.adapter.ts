import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';
import { StructuredOutputParser, OutputFixingParser } from 'langchain/output_parsers';
import { ZodSchema } from 'zod';

@Injectable()
export class GoogleAdapter implements LlmAdapter {
  private readonly logger = new Logger(GoogleAdapter.name);
  private readonly apiKey: string;
  private googleAI: ChatGoogleGenerativeAI;
  name = 'Google';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_API_KEY', '');

    if (this.isAvailable()) {
      this.googleAI = new ChatGoogleGenerativeAI({
        apiKey: this.apiKey,
        model: 'gemini-1.5-pro', // Default model
        temperature: 0.7,
      });
    }
  }

  isAvailable(): boolean {
    // Only consider available if the API key is provided and not empty
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async call(prompt: string, options?: LlmCallOptions): Promise<LlmResponse> {
    if (!this.isAvailable()) {
      throw new Error('Google API key not configured');
    }

    try {
      // Determine the model to use (default or from options)
      const modelName = options?.model || 'gemini-1.5-pro';

      // Configure Google client with updated options
      const client = new ChatGoogleGenerativeAI({
        apiKey: this.apiKey,
        model: modelName,
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 1000,
        // topP: options?.topP ,
      });

      // Create messages array
      const messages = [];

      // Add system message if provided
      if (options?.systemPrompt) {
        messages.push(new SystemMessage(options.systemPrompt));
      }

      // Add user message
      messages.push(new HumanMessage(prompt));

      // Call the model
      const result = await client.call(messages);
      const text = result.content.toString();

      // Get token usage if available
      const usage = (result as any).usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

      return {
        text,
        modelVersion: modelName,
        tokenUsage: {
          input: usage.input_tokens || 0,
          output: usage.output_tokens || 0,
          total: (usage.input_tokens || 0) + (usage.output_tokens || 0),
        },
      };
    } catch (error) {
      this.logger.error(`Error calling Google API: ${error.message}`);
      throw new Error(`Failed to call Google API: ${error.message}`);
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
      throw new Error('Google API not available for structured output');
    }

    try {
      // Determine the model to use (default or from options)
      const modelName = options?.model || 'gemini-1.5-pro';

      // Configure Google client with updated options
      const client = new ChatGoogleGenerativeAI({
        apiKey: this.apiKey,
        model: modelName,
        temperature: options?.temperature ?? 0.2, // Lower temperature for structured output
        maxOutputTokens: options?.maxTokens ?? 1000,
        topP: options?.topP ?? 1,
      });

      // Create a parser based on the schema
      const parser = StructuredOutputParser.fromZodSchema(schema);

      // Create a fixing parser for error recovery
      const fixingParser = OutputFixingParser.fromLLM(client, parser);

      // Get format instructions
      const formatInstructions = parser.getFormatInstructions();

      // Create messages array
      const messages = [];

      // Add system message if provided
      if (options?.systemPrompt) {
        messages.push(new SystemMessage(options.systemPrompt));
      } else {
        // Default system message for structured output
        messages.push(
          new SystemMessage(
            'You are a helpful assistant that always responds with structured data.',
          ),
        );
      }

      // Add user message with format instructions
      const userPrompt = `${prompt}\n\n${formatInstructions}\n\nYour response:`;
      messages.push(new HumanMessage(userPrompt));

      // Call the model
      const result = await client.call(messages);
      const text = result.content.toString();

      // Try to parse the response
      try {
        return await parser.parse(text);
      } catch (error) {
        // If parsing fails, try to fix the output
        this.logger.warn(`Failed to parse structured output, attempting to fix: ${error.message}`);
        return await fixingParser.parse(text);
      }
    } catch (error) {
      this.logger.error(`Error getting structured output: ${error.message}`);
      throw new Error(`Failed to get structured output: ${error.message}`);
    }
  }
}
