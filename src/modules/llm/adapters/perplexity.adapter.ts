import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatPerplexity } from '@langchain/community/chat_models/perplexity';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';

@Injectable()
export class PerplexityAdapter implements LlmAdapter {
  private readonly logger = new Logger(PerplexityAdapter.name);
  private readonly apiKey: string;
  name = 'Perplexity';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('PERPLEXITY_API_KEY', '');
  }

  isAvailable(): boolean {
    // Only consider available if the API key is provided and not empty
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async call(prompt: string, options?: LlmCallOptions): Promise<LlmResponse> {
    if (!this.isAvailable()) {
      throw new Error('Perplexity API key not configured');
    }

    try {
      // Default model is Sonar-Medium-Online
      const model = options?.model || 'sonar-medium-online';

      const chatModel = new ChatPerplexity({
        apiKey: this.apiKey,
        model: model,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens,
        //  topP: options?.topP,
        // timeout: options?.timeout ?? 30000,
      });

      const messages = [];
      if (options?.systemPrompt) {
        messages.push(new SystemMessage(options.systemPrompt));
      }
      messages.push(new HumanMessage(prompt));

      const response = await chatModel.invoke(messages);

      // Get token usage if available
      const usage = (chatModel as any).lastUsage || {};

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
      this.logger.error(`Error calling Perplexity API: ${error.message}`);
      throw new Error(`Failed to call Perplexity API: ${error.message}`);
    }
  }
}
