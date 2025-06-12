/**
 * Shared LLM configuration interfaces for the batch module
 */
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';

/**
 * Enum for prompt types to ensure type safety
 */
export enum PromptType {
  VISIBILITY = 'visibility',
  COMPETITION = 'competition',
  ALIGNMENT = 'alignment',
  SENTIMENT = 'sentiment',
}

/**
 * Enum for pipeline types to ensure type safety
 */
export enum PipelineType {
  VISIBILITY = 'visibility',
  SENTIMENT = 'sentiment',
  COMPETITION = 'competition',
  ALIGNMENT = 'alignment',
}

export interface LlmModelConfig {
  id: string;
  provider: LlmProvider;
  model: string;
  enabled: boolean;
  name: string;
  webAccess?: boolean; // Whether this model has web access enabled
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
    visibility: AnalyzerConfig;
    sentiment: AnalyzerConfig;
    competition: AnalyzerConfig;
    alignment?: AnalyzerConfig;
  };
  concurrencyLimit: number;
  pipelineLimits?: {
    visibility?: number;
    sentiment?: number;
    competition?: number;
    alignment?: number;
  };
}
