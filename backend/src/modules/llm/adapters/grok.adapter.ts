import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';
import { xai, createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';

@Injectable()
export class GrokAdapter implements LlmAdapter {
  private readonly logger = new Logger(GrokAdapter.name);
  private readonly apiKey: string;
  name = 'Grok';
  private readonly xaiProvider: ReturnType<typeof createXai>;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GROK_API_KEY', '');
    this.xaiProvider = createXai({
      apiKey: this.apiKey,
    });
  }

  isAvailable(): boolean {
    // Only consider available if the API key is provided and not empty
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async call(prompt: string, options?: LlmCallOptions): Promise<LlmResponse> {
    if (!this.isAvailable()) {
      throw new Error('Grok API key not configured');
    }

    try {
      const model = options?.model || 'grok-3-beta';
      const temperature = options?.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? 1000;
      // The SDK expects a prompt (string) or messages (array). We'll use prompt for now.
      const result = await generateText({
        model: this.xaiProvider(model),
        prompt,
        temperature,
        maxTokens,
      });
      return {
        text: result.text,
        modelVersion: model || 'grok-3-beta',
        tokenUsage: result.usage
          ? {
              input: result.usage.promptTokens || 0,
              output: result.usage.completionTokens || 0,
              total: result.usage.totalTokens || 0,
            }
          : undefined,
        responseMetadata: result,
      };
    } catch (error: any) {
      this.logger.error(`Error calling Grok SDK: ${error.message}`);
      throw new Error(`Failed to call Grok SDK: ${error.message}`);
    }
  }
}
