import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';
import { ZodSchema } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';

@Injectable()
export class OpenAILangChainAdapter implements LlmAdapter {
  private readonly logger = new Logger(OpenAILangChainAdapter.name);
  private readonly apiKey: string;
  name = 'OpenAILangChain';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY', '');
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
      if (!options?.model) {
        throw new Error("Model not specified. Please specify a model using the 'model' option.")
      }
      const model = options?.model;

      this.logger.log(`Calling OpenAI API with model: ${model}`);

      const chatModel = new ChatOpenAI({
        openAIApiKey: this.apiKey,
        modelName: model,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens,
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
          input: usage.promptTokens || 0,
          output: usage.completionTokens || 0,
          total: usage.totalTokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Error calling OpenAI API via LangChain: ${error.message}`);
      throw new Error(`Failed to call OpenAI API via LangChain: ${error.message}`);
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
      const model = options?.model || 'gpt-4o';

      // Create a LangChain structured output parser from the Zod schema
      const outputParser = StructuredOutputParser.fromZodSchema(schema as any);

      // Get the format instructions
      const formatInstructions = outputParser.getFormatInstructions();

      // Create a system message with enhanced instructions
      const systemMessage =
        options?.systemPrompt ||
        'You are a helpful assistant that always responds with structured data.';

      // Enhanced prompt with schema instructions
      const enhancedPrompt = `${prompt}
      ${formatInstructions}
      Your response must conform to the schema defined above. Respond with just the JSON object, no additional text or explanations.`;

      this.logger.log(`Calling OpenAI API with model: ${model}`);
      // Create the chat model with response format JSON
      const chatModel = new ChatOpenAI({
        openAIApiKey: this.apiKey,
        modelName: model,
        temperature: options?.temperature ?? 0.2, // Lower temperature for structured output
        maxTokens: options?.maxTokens ?? 2000,
      });

      // Prepare messages
      const messages = [new SystemMessage(systemMessage), new HumanMessage(enhancedPrompt)];

      // Get the response

      try {
        // Use the output parser to parse and validate the response
        const result = await chatModel.withStructuredOutput(schema as any).invoke(messages);
        return result as T;
      } catch (error) {
        this.logger.error(error, `Failed to get structured output: ${error.message}`);
        throw error;
      }
    } catch (error) {
      this.logger.error(`Error getting structured output: ${error.message}`);
      throw new Error(`Failed to get structured output: ${error.message}`);
    }
  }
}
