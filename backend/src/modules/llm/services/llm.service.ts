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
   * This will automatically select the appropriate adapter (LangChain-based) for structured output
   */
  async getStructuredOutput<T>(
    provider: string,
    prompt: string,
    schema: ZodSchema<T>,
    options?: LlmCallOptions
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
  
  /**
   * Helper method to get the appropriate adapter for structured output
   * This will automatically convert provider names to their LangChain counterparts
   */
  private getStructuredOutputAdapter(provider: string): LlmAdapter {
    // Map standard provider names to their LangChain structured output variants
    const providerMap: Record<string, string> = {
      // Standard provider name mapping
      'anthropic': 'anthropicLangChain',
      'openai': 'openAiLangChain',
      
      // Handle case variations
      'Anthropic': 'anthropicLangChain',
      'OpenAI': 'openAiLangChain',
      'ANTHROPIC': 'anthropicLangChain',
      'OPENAI': 'openAiLangChain',
      
      // Allow direct usage of LangChain adapters
      'anthropicLangChain': 'anthropicLangChain',
      'openAiLangChain': 'openAiLangChain',
      'AnthropicLangChain': 'anthropicLangChain',
      'OpenAILangChain': 'openAiLangChain',
      
      // Add more mappings as needed
    };
    
    // Check if we need to use a specialized adapter for structured output
    const mappedProvider = providerMap[provider] || provider.toLowerCase();
    
    this.logger.log(`Using ${mappedProvider} adapter for structured output (mapped from ${provider})`);
    
    const adapterKey = Object.keys(this.adapters).find(
      key => key.toLowerCase() === mappedProvider.toLowerCase()
    );

    if (!adapterKey) {
      throw new Error(`LLM provider '${provider}' is not available for structured output (mapped to '${mappedProvider}' but no adapter found)`);
    }

    const adapter = this.adapters[adapterKey];

    if (!adapter.isAvailable()) {
      throw new Error(`LLM provider '${provider}' is not available for structured output (API key not configured)`);
    }

    return adapter;
  }
}