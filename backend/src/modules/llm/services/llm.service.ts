import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pLimit from 'p-limit';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';
import { ZodSchema } from 'zod';
import { LlmProvider } from '../interfaces/llm-provider.enum';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly limiter: ReturnType<typeof pLimit>;
  private readonly adapters: Record<LlmProvider, LlmAdapter>;

  constructor(
    private readonly configService: ConfigService,
    @Inject('LLM_ADAPTERS') private readonly llmAdapters: Record<LlmProvider, LlmAdapter>,
  ) {
    // Initialize the concurrency limiter with very high value for maximizing API throughput
    // Ensure concurrencyLimit is a number and at least 1
    const configLimit = this.configService.get<string | number>('CONCURRENCY_LIMIT', '100');

    const concurrencyLimit = Math.max(1, parseInt(String(configLimit), 10) || 100);

    this.limiter = pLimit(concurrencyLimit);
    this.adapters = llmAdapters;
    this.logger.log(`Initialized LLM service with concurrency limit of ${concurrencyLimit}`);
  }

  /**
   * Get all available LLM adapters
   */
  getAvailableAdapters(): LlmAdapter[] {
    return Object.values(this.adapters).filter((adapter) => adapter.isAvailable());
  }

  /**
   * Call multiple LLMs with the same prompt
   */
  async callMultiple(
    prompt: string,
    options?: LlmCallOptions,
  ): Promise<Record<string, LlmResponse>> {
    const adapters = this.getAvailableAdapters();
    this.logger.log(`Calling ${adapters.length} LLM providers with prompt`);

    const results: Record<string, LlmResponse> = {};

    // Use Promise.allSettled to handle potential failures from some providers
    const promises = adapters.map((adapter) =>
      this.limiter(async () => {
        try {
          const response = await adapter.call(prompt, options);
          results[adapter.name] = response;
          return { adapter: adapter.name, success: true };
        } catch (error) {
          this.logger.error(`Error calling ${adapter.name}: ${error.message}`);
          return { adapter: adapter.name, success: false, error: error.message };
        }
      }),
    );

    await Promise.allSettled(promises);

    return results;
  }

  /**
   * Call a specific LLM provider
   */
  async call(
    provider: LlmProvider,
    prompt: string,
    options?: LlmCallOptions,
  ): Promise<LlmResponse> {
    const adapter = this.getAdapter(provider);
    return this.limiter(() => adapter.call(prompt, options));
  }

  /**
   * Get structured output from an LLM provider using a schema
   * This will automatically select the appropriate adapter (LangChain-based) for structured output
   */
  async getStructuredOutput<T>(
    provider: LlmProvider,
    prompt: string,
    schema: ZodSchema<T>,
    options?: LlmCallOptions,
  ): Promise<T> {
    // For structured output, we want to use the LangChain-based adapters
    // Provider will be automatically mapped to the appropriate LangChain adapter
    // This allows services to use 'Anthropic' and we'll automatically use 'AnthropicLangChain'
    const adapter = this.getStructuredOutputAdapter(provider);

    if (!adapter.getStructuredOutput) {
      throw new Error(`Provider '${provider}' does not support structured output`);
    }

    return this.limiter(() => adapter.getStructuredOutput!(prompt, schema, options));
  }

  /**
   * Helper method to get and validate an adapter
   */
  private getAdapter(provider: LlmProvider): LlmAdapter {
    const adapter = this.adapters[provider];

    if (!adapter.isAvailable()) {
      throw new Error(`LLM provider '${provider}' is not available (API key not configured)`);
    }

    return adapter;
  }

  /**
   * Helper method to get the appropriate adapter for structured output
   * This will automatically convert provider names to their LangChain counterparts
   */
  private getStructuredOutputAdapter(provider: LlmProvider): LlmAdapter {
    switch (provider) {
      case LlmProvider.Anthropic:
        return this.adapters[LlmProvider.AnthropicLangChain];
      case LlmProvider.OpenAI:
        return this.adapters[LlmProvider.OpenAILangChain];
      case LlmProvider.OpenAILangChain:
        return this.adapters[LlmProvider.OpenAILangChain];
      case LlmProvider.AnthropicLangChain:
        return this.adapters[LlmProvider.AnthropicLangChain];
      case LlmProvider.Perplexity:
        return this.adapters[LlmProvider.Perplexity];
      default:
        throw new Error(`Unsupported provider for structured output: ${provider}`);
    }
  }
}
