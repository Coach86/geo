import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pLimit from 'p-limit';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';
import { ZodSchema } from 'zod';
import { LlmProvider } from '../interfaces/llm-provider.enum';
import { RetryUtil, RetryOptions } from '../../../utils/retry.util';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly limiter: ReturnType<typeof pLimit>;
  private readonly adapters: Record<LlmProvider, LlmAdapter>;
  private readonly retryOptions: RetryOptions;

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

    // Configure retry options from environment variables
    this.retryOptions = {
      maxRetries: parseInt(this.configService.get<string>('LLM_MAX_RETRIES', '3'), 10),
      baseDelayMs: parseInt(this.configService.get<string>('LLM_BASE_DELAY_MS', '1000'), 10),
      maxDelayMs: parseInt(this.configService.get<string>('LLM_MAX_DELAY_MS', '30000'), 10),
      backoffFactor: parseFloat(this.configService.get<string>('LLM_BACKOFF_FACTOR', '2.0')),
      retryCondition: RetryUtil.isRateLimitError,
    };

    this.logger.log(`Initialized LLM service with concurrency limit of ${concurrencyLimit}`);
    this.logger.log(
      `Retry configuration: maxRetries=${this.retryOptions.maxRetries}, ` +
      `baseDelay=${this.retryOptions.baseDelayMs}ms, maxDelay=${this.retryOptions.maxDelayMs}ms, ` +
      `backoffFactor=${this.retryOptions.backoffFactor}`
    );
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
          const response = await RetryUtil.withRetry(
            () => adapter.call(prompt, options),
            this.retryOptions,
            `${adapter.name} API call`
          );
          results[adapter.name] = response;
          return { adapter: adapter.name, success: true };
        } catch (error) {
          this.logger.error(`Error calling ${adapter.name} after retries: ${error.message}`);
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
    return this.limiter(() => 
      RetryUtil.withRetry(
        () => adapter.call(prompt, options),
        this.retryOptions,
        `${provider} API call`
      )
    );
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

    return this.limiter(() => 
      RetryUtil.withRetry(
        () => adapter.getStructuredOutput!(prompt, schema, options),
        this.retryOptions,
        `${provider} structured output call`
      )
    );
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
