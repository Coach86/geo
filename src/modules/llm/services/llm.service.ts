import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pLimit from 'p-limit';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';
import { ZodSchema } from 'zod';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly limiter: ReturnType<typeof pLimit>;
  private readonly adapters: Record<string, LlmAdapter>;

  constructor(
    private readonly configService: ConfigService,
    @Inject('LLM_ADAPTERS') private readonly llmAdapters: Record<string, LlmAdapter>,
  ) {
    // Initialize the concurrency limiter
    // Ensure concurrencyLimit is a number and at least 1
    const configLimit = this.configService.get<string | number>('CONCURRENCY_LIMIT', '5');
    const concurrencyLimit = Math.max(1, parseInt(String(configLimit), 10) || 5);

    this.limiter = pLimit(concurrencyLimit);
    this.adapters = llmAdapters;
    this.logger.log(`Initialized LLM service with concurrency limit of ${concurrencyLimit}`);
  }

  /**
   * Get all available LLM adapters
   */
  getAvailableAdapters(): LlmAdapter[] {
    return Object.values(this.adapters).filter(adapter => adapter.isAvailable());
  }

  /**
   * Call multiple LLMs with the same prompt
   */
  async callMultiple(
    prompt: string, 
    options?: LlmCallOptions
  ): Promise<Record<string, LlmResponse>> {
    const adapters = this.getAvailableAdapters();
    this.logger.log(`Calling ${adapters.length} LLM providers with prompt`);
    
    const results: Record<string, LlmResponse> = {};
    
    // Use Promise.allSettled to handle potential failures from some providers
    const promises = adapters.map(adapter => 
      this.limiter(async () => {
        try {
          const response = await adapter.call(prompt, options);
          results[adapter.name] = response;
          return { adapter: adapter.name, success: true };
        } catch (error) {
          this.logger.error(`Error calling ${adapter.name}: ${error.message}`);
          return { adapter: adapter.name, success: false, error: error.message };
        }
      })
    );
    
    await Promise.allSettled(promises);
    
    return results;
  }

  /**
   * Call a specific LLM provider
   */
  async call(
    provider: string,
    prompt: string,
    options?: LlmCallOptions
  ): Promise<LlmResponse> {
    const adapter = this.getAdapter(provider);
    return this.limiter(() => adapter.call(prompt, options));
  }

  /**
   * Get structured output from an LLM provider using a schema
   */
  async getStructuredOutput<T>(
    provider: string,
    prompt: string,
    schema: ZodSchema<T>,
    options?: LlmCallOptions
  ): Promise<T> {
    const adapter = this.getAdapter(provider);

    if (!adapter.getStructuredOutput) {
      throw new Error(`Provider '${provider}' does not support structured output`);
    }

    return this.limiter(() => adapter.getStructuredOutput!(prompt, schema, options));
  }

  /**
   * Helper method to get and validate an adapter
   */
  private getAdapter(provider: string): LlmAdapter {
    const normalizedProvider = provider.toLowerCase();
    const adapterKey = Object.keys(this.adapters).find(
      key => key.toLowerCase() === normalizedProvider
    );

    if (!adapterKey) {
      throw new Error(`LLM provider '${provider}' is not available`);
    }

    const adapter = this.adapters[adapterKey];

    if (!adapter.isAvailable()) {
      throw new Error(`LLM provider '${provider}' is not available (API key not configured)`);
    }

    return adapter;
  }
}