import { Injectable } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
import { LLMCallTrackerService } from './llm-call-tracker.service';

/**
 * Wrapper for LLM service that tracks all calls
 */
@Injectable()
export class TrackedLLMService {
  constructor(
    private readonly llmService: LlmService,
    private readonly tracker: LLMCallTrackerService,
  ) {}

  async call(
    url: string,
    purpose: string,
    provider: LlmProvider,
    prompt: string,
    options?: any,
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Make the actual LLM call
      const response = await this.llmService.call(provider, prompt, options);
      
      // Track the successful call
      this.tracker.addCall(url, {
        purpose,
        prompt,
        response: response.text,
        model: options?.model || 'unknown',
        tokensUsed: response.tokenUsage ? {
          input: response.tokenUsage.input,
          output: response.tokenUsage.output,
        } : undefined,
      });
      
      return response;
    } catch (error) {
      // Track the failed call
      this.tracker.addCall(url, {
        purpose,
        prompt,
        response: '',
        model: options?.model || 'unknown',
        error: error.message,
      });
      
      throw error;
    }
  }
}