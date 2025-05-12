import { ZodSchema } from 'zod';

export interface LlmCallOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  timeout?: number;
  systemPrompt?: string; // System prompt for chat models
  model?: string; // Specific model to use (e.g., gpt-4.5 from OpenAI provider)
}

export interface LlmResponse {
  text: string;
  modelVersion: string;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface LlmAdapter {
  name: string;
  call(prompt: string, options?: LlmCallOptions): Promise<LlmResponse>;
  isAvailable(): boolean;

  /**
   * Get structured output conforming to a schema
   * Optional but recommended for adapters that support it
   */
  getStructuredOutput?<T>(prompt: string, schema: ZodSchema<T>, options?: LlmCallOptions): Promise<T>;
}