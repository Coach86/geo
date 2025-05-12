import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';
import { StructuredOutputParser, OutputFixingParser } from 'langchain/output_parsers';
import { ZodSchema } from 'zod';

@Injectable()
export class AnthropicAdapter implements LlmAdapter {
  private readonly logger = new Logger(AnthropicAdapter.name);
  private readonly apiKey: string;
  private anthropic: ChatAnthropic;
  name = 'Anthropic';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY', '');

    if (this.isAvailable() && !this.isMockMode()) {
      this.anthropic = new ChatAnthropic({
        anthropicApiKey: this.apiKey,
        modelName: 'claude-3-opus-20240229', // Default model
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
      throw new Error('Anthropic API key not configured');
    }

    try {
      // If in mock mode, return a mock response
      if (this.isMockMode()) {
        this.logger.log('Using mock mode for Anthropic');
        return this.createMockResponse(prompt);
      }

      // Determine the model to use (default or from options)
      const modelName = options?.model || 'claude-3-opus-20240229';

      // Configure Anthropic client with updated options
      const client = new ChatAnthropic({
        anthropicApiKey: this.apiKey,
        modelName,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 1000,
        //  topP: options?.topP,
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

      // Get token usage if available (Anthropic might include this in a different format)
      const usage = (result as any).usage || { input_tokens: 0, output_tokens: 0 };

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
      this.logger.error(`Error calling Anthropic API: ${error.message}`);
      throw new Error(`Failed to call Anthropic API: ${error.message}`);
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
      throw new Error('Anthropic API not available for structured output');
    }

    try {
      // Determine the model to use (default or from options)
      const modelName = options?.model || 'claude-3-opus-20240229';

      // Configure Anthropic client with updated options
      const client = new ChatAnthropic({
        anthropicApiKey: this.apiKey,
        modelName,
        temperature: options?.temperature ?? 0.2, // Lower temperature for structured output
        maxTokens: options?.maxTokens ?? 1000,
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

  private createMockResponse(prompt: string): LlmResponse {
    // Generate a somewhat relevant response based on the prompt
    let responseText = `This is a mock response from Claude for your prompt about `;

    if (prompt.toLowerCase().includes('company')) {
      responseText +=
        'companies. Based on my analysis, this company appears to be a technology provider focusing on enterprise solutions.';
    } else if (prompt.toLowerCase().includes('industry')) {
      responseText +=
        'industries. In the technology sector, there are several leading companies offering innovative solutions.';
    } else if (prompt.toLowerCase().includes('competitor')) {
      responseText +=
        'competitors. The main competitors in this space include several enterprise technology providers with different strengths.';
    } else {
      responseText += 'that topic. I have some information that might be relevant to your query.';
    }

    return {
      text: responseText,
      modelVersion: 'claude-3-opus-mock',
      tokenUsage: {
        input: 60,
        output: 120,
        total: 180,
      },
    };
  }
}
