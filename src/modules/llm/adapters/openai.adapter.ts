import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';
import { StructuredOutputParser, OutputFixingParser } from 'langchain/output_parsers';
import { ZodSchema } from 'zod';

@Injectable()
export class OpenAiAdapter implements LlmAdapter {
  private readonly logger = new Logger(OpenAiAdapter.name);
  private readonly apiKey: string;
  private openAI: ChatOpenAI;
  name = 'OpenAI';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY', '');

    if (this.isAvailable() && !this.isMockMode()) {
      this.openAI = new ChatOpenAI({
        openAIApiKey: this.apiKey,
        modelName: 'gpt-4o', // Default model
        temperature: 0.7,
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
      // If in mock mode, return a mock response
      if (this.isMockMode()) {
        this.logger.log('Using mock mode for OpenAI');
        return this.createMockResponse(prompt);
      }

      // Determine the model to use (default or from options)
      const modelName = options?.model || 'gpt-4o';

      // Configure OpenAI client with updated options
      const client = new ChatOpenAI({
        openAIApiKey: this.apiKey,
        modelName,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 1000,
        //  topP: options?.topP,
        timeout: options?.timeout ?? 30000,
        //  stopSequences: options?.stopSequences,
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
      const usage = (result as any).usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      return {
        text,
        modelVersion: modelName,
        tokenUsage: {
          input: usage.prompt_tokens,
          output: usage.completion_tokens,
          total: usage.total_tokens,
        },
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
    if (!this.isAvailable() || this.isMockMode()) {
      throw new Error('OpenAI API not available for structured output');
    }

    try {
      // Determine the model to use (default or from options)
      const modelName = options?.model || 'gpt-4o';

      // Configure OpenAI client with updated options
      const client = new ChatOpenAI({
        openAIApiKey: this.apiKey,
        modelName,
        temperature: options?.temperature ?? 0.2, // Lower temperature for structured output
        maxTokens: options?.maxTokens ?? 1000,
        topP: options?.topP ?? 1,
        timeout: options?.timeout ?? 30000,
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

  private createMockResponse(prompt: string): LlmResponse {
    // Generate a somewhat relevant response based on the prompt
    let responseText = `This is a mock response from OpenAI for your prompt about `;

    if (prompt.toLowerCase().includes('company')) {
      responseText +=
        'companies. The company you mentioned appears to be in the technology sector, focusing on innovative solutions.';
    } else if (prompt.toLowerCase().includes('industry')) {
      responseText +=
        'industries. The technology industry is growing rapidly with many innovative companies.';
    } else if (prompt.toLowerCase().includes('competitor')) {
      responseText +=
        'competitors. Major companies in this space include TechGiant Inc., InnovateTech, and Enterprise Systems.';
    } else {
      responseText += 'that topic. I found some interesting information that might be helpful.';
    }

    return {
      text: responseText,
      modelVersion: 'gpt-4o-mock',
      tokenUsage: {
        input: 50,
        output: 100,
        total: 150,
      },
    };
  }
}
