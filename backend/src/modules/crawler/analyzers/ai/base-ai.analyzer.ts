import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../../llm/services/llm.service';
import { ConfigService } from '@nestjs/config';
import { RetryUtil } from '../../../../utils/retry.util';

export interface AIAnalysisResult<T> {
  score: number;
  details: T;
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
  explanation: string;
  model: string;
  cost: number;
  duration: number;
}

@Injectable()
export abstract class BaseAIAnalyzer<TDetails> {
  protected readonly logger: Logger;
  protected readonly maxRetries = 3;
  protected readonly cacheEnabled: boolean;
  protected readonly cacheTTL: number;

  constructor(
    protected readonly llmService: LLMService,
    protected readonly configService: ConfigService,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.cacheEnabled = this.configService.get<boolean>('CONTENT_KPI_USE_CACHE', true);
    this.cacheTTL = this.configService.get<number>('CONTENT_KPI_CACHE_TTL', 86400);
  }

  abstract getDimension(): string;
  abstract buildPrompt(html: string, context: any): string;
  abstract parseResponse(response: any): AIAnalysisResult<TDetails>;
  abstract getModelPriority(): string[];

  async analyze(html: string, context: any): Promise<AIAnalysisResult<TDetails>> {
    const startTime = Date.now();
    const dimension = this.getDimension();
    
    this.logger.log(`[AI-${dimension.toUpperCase()}] Starting AI analysis`);

    // Try models in priority order
    const models = this.getModelPriority();
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        this.logger.log(`[AI-${dimension.toUpperCase()}] Attempting with model: ${model}`);
        
        const result = await this.analyzeWithModel(html, context, model);
        
        const duration = Date.now() - startTime;
        this.logger.log(
          `[AI-${dimension.toUpperCase()}] Analysis completed - Score: ${result.score}/100, ` +
          `Model: ${model}, Duration: ${duration}ms, Cost: $${result.cost.toFixed(4)}`
        );

        return { ...result, duration };
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `[AI-${dimension.toUpperCase()}] Model ${model} failed: ${error.message}, trying next...`
        );
      }
    }

    // All models failed
    this.logger.error(
      `[AI-${dimension.toUpperCase()}] All models failed for dimension ${dimension}`,
      lastError
    );
    throw new Error(`Failed to analyze ${dimension} with all available models: ${lastError?.message}`);
  }

  private async analyzeWithModel(
    html: string,
    context: any,
    model: string
  ): Promise<AIAnalysisResult<TDetails>> {
    const prompt = this.buildPrompt(html, context);
    
    // Estimate tokens for cost calculation
    const estimatedTokens = this.estimateTokens(prompt + html);
    const estimatedCost = this.estimateCost(model, estimatedTokens);

    // Check cost limit
    const maxCostPerPage = this.configService.get<number>('CONTENT_KPI_MAX_COST_PER_PAGE', 0.10);
    if (estimatedCost > maxCostPerPage) {
      throw new Error(`Estimated cost $${estimatedCost.toFixed(4)} exceeds limit $${maxCostPerPage}`);
    }

    // Make LLM call with retry
    const response = await RetryUtil.withRetry(
      async () => {
        return await this.llmService.generateStructuredResponse({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert SEO and content analyst. Analyze web content and provide structured JSON responses.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1, // Low temperature for consistent scoring
          maxTokens: 2000,
        });
      },
      {
        maxRetries: this.maxRetries,
        baseDelayMs: 2000,
        maxDelayMs: 10000,
      },
      `AI analysis for ${this.getDimension()}`
    );

    // Parse and validate response
    try {
      const parsed = this.parseResponse(response);
      return {
        ...parsed,
        model,
        cost: estimatedCost,
      };
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error.message}`);
    }
  }

  protected estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  protected estimateCost(model: string, tokens: number): number {
    // Cost per 1K tokens (approximate)
    const costMap: Record<string, { input: number; output: number }> = {
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gemini-pro': { input: 0.00025, output: 0.0005 },
    };

    const modelCost = costMap[model] || costMap['gpt-3.5-turbo'];
    const inputCost = (tokens / 1000) * modelCost.input;
    const outputCost = (tokens / 1000) * modelCost.output * 0.5; // Assume output is 50% of input
    
    return inputCost + outputCost;
  }

  protected cleanHtml(html: string): string {
    // Remove scripts, styles, and excessive whitespace
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  protected truncateContent(content: string, maxLength: number = 10000): string {
    if (content.length <= maxLength) {
      return content;
    }
    
    // Try to truncate at a sentence boundary
    const truncated = content.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    
    if (lastPeriod > maxLength * 0.8) {
      return truncated.substring(0, lastPeriod + 1);
    }
    
    return truncated + '...';
  }
}