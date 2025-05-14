import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';
import { ZodSchema } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';

@Injectable()
export class AnthropicLangChainAdapter implements LlmAdapter {
  private readonly logger = new Logger(AnthropicLangChainAdapter.name);
  private readonly apiKey: string;
  name = 'AnthropicLangChain';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY', '');
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
      // Default model is Claude 3 Sonnet
      const model = options?.model || 'claude-3-7-sonnet-20250219';

      const chatModel = new ChatAnthropic({
        anthropicApiKey: this.apiKey,
        modelName: model,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 1000,
      });

      const messages = [];
      if (options?.systemPrompt) {
        messages.push(new SystemMessage(options.systemPrompt));
      }
      messages.push(new HumanMessage(prompt));

      const response = await chatModel.invoke(messages);

      // Get token usage if available
      const usage = (chatModel as any).usage || {};

      return {
        text: response.content.toString(),
        modelVersion: model,
        tokenUsage: {
          input: usage.inputTokens || 0,
          output: usage.outputTokens || 0,
          total: (usage.inputTokens || 0) + (usage.outputTokens || 0),
        },
      };
    } catch (error) {
      this.logger.error(`Error calling Anthropic API via LangChain: ${error.message}`);
      throw new Error(`Failed to call Anthropic API via LangChain: ${error.message}`);
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
      const model = options?.model || 'claude-3-7-sonnet-20250219';

      // Create a LangChain structured output parser from the Zod schema
      const outputParser = StructuredOutputParser.fromZodSchema(schema);

      // Get the format instructions
      const formatInstructions = outputParser.getFormatInstructions();

      // Create a system message with enhanced instructions
      const systemMessage =
        options?.systemPrompt ||
        'You are a helpful assistant that always responds with structured data.';

      // Enhanced prompt with schema instructions
      const enhancedPrompt = `${prompt}\n\n${formatInstructions}\n\nYour response must conform to the schema defined above. Respond with just the JSON object, no additional text or explanations.`;

      // Create the chat model
      const chatModel = new ChatAnthropic({
        anthropicApiKey: this.apiKey,
        modelName: model,
        temperature: options?.temperature ?? 0.2, // Lower temperature for structured output
        maxTokens: options?.maxTokens ?? 2000,
      });

      // Prepare messages
      const messages = [new SystemMessage(systemMessage), new HumanMessage(enhancedPrompt)];

      // Get the response
      const response = await chatModel.invoke(messages);

      // Parse the response to extract the JSON object
      const jsonText = response.content.toString();

      try {
        // Use the output parser to parse and validate the response
        const result = await outputParser.parse(jsonText);
        return result;
      } catch (parseError) {
        this.logger.error(`Failed to parse JSON response: ${parseError.message}`);

        // Try to fix common JSON errors by making a second request
        const fixingPrompt = `The following JSON is invalid or doesn't match the required schema. Please fix it and return a valid JSON object:\n\n${jsonText}\n\nThe schema is:\n${formatInstructions}`;

        const fixingMessages = [
          new SystemMessage(
            'You are a helpful assistant that corrects JSON to match a given schema. Only respond with valid JSON.',
          ),
          new HumanMessage(fixingPrompt),
        ];

        const fixingResponse = await chatModel.invoke(fixingMessages);

        // Try parsing the fixed JSON
        const fixedJsonText = fixingResponse.content.toString();
        return await outputParser.parse(fixedJsonText);
      }
    } catch (error) {
      this.logger.error(`Error getting structured output: ${error.message}`);
      throw new Error(`Failed to get structured output: ${error.message}`);
    }
  }
}
