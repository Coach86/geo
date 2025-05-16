/**
 * Shared LLM configuration interfaces for the batch module
 */
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';

/**
 * Enum for prompt types to ensure type safety
 */
export enum PromptType {
  SPONTANEOUS = 'spontaneous',
  DIRECT = 'direct',
  COMPARISON = 'comparison',
  ACCURACY = 'accuracy'
}

/**
 * Enum for pipeline types to ensure type safety
 */
export enum PipelineType {
  SPONTANEOUS = 'spontaneous',
  SENTIMENT = 'sentiment',
  COMPARISON = 'comparison',
  ACCURACY = 'accuracy'
}
export interface LlmModelConfig {
  id: string;
  provider: LlmProvider;
  model: string;
  enabled: boolean;
  name: string;
  parameters: {
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
}

export interface ModelIdentifier {
  provider: LlmProvider;
  model: string;
}

export interface AnalyzerConfig {
  primary: ModelIdentifier;
  fallback: ModelIdentifier;
  runsPerModel?: number; // Number of times to run each model/prompt combination (defaults to 1)
}

export interface PipelineConfig {
  llmModels: LlmModelConfig[];
  analyzerConfig: {
    spontaneous: AnalyzerConfig;
    sentiment: AnalyzerConfig;
    comparison: AnalyzerConfig;
    accuracy?: AnalyzerConfig;
  };
  concurrencyLimit: number;
  pipelineLimits?: {
    spontaneous?: number;
    sentiment?: number;
    comparison?: number;
    accuracy?: number;
  };
}
