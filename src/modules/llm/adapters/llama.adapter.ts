import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';

@Injectable()
export class LlamaAdapter implements LlmAdapter {
  private readonly logger = new Logger(LlamaAdapter.name);
  private readonly apiKey: string;
  name = 'LLAMA';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LLAMA_API_KEY', '');
  }

  isAvailable(): boolean {
    // Only consider available if the API key is provided and not empty
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async call(prompt: string, options?: LlmCallOptions): Promise<LlmResponse> {
    if (!this.isAvailable()) {
      throw new Error('LLAMA API key not configured');
    }

    try {
      // Default model is Llama 3
      const model = 'llama-3-70b-chat';

      // Meta's Llama 3 API or a third-party provider - adjust endpoint as needed
      const requestBody = {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
        //     top_p: options?.topP,
        //     stop: options?.stopSequences,
      };

      // Note: Meta doesn't have a direct API for Llama 3 currently
      // This is using a placeholder endpoint - replace with actual endpoint
      const response = await axios.post(
        'https://api.together.xyz/v1/chat/completions', // Example endpoint
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: options?.timeout ?? 30000,
        },
      );

      const result = response.data;
      const text = result.choices[0].message.content;

      return {
        text,
        modelVersion: model,
        tokenUsage: {
          input: result.usage?.prompt_tokens || 0,
          output: result.usage?.completion_tokens || 0,
          total: result.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Error calling LLAMA API: ${error.message}`);
      throw new Error(`Failed to call LLAMA API: ${error.message}`);
    }
  }
}
