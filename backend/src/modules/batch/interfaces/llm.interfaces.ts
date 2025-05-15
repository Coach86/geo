/**
 * Shared LLM configuration interfaces for the batch module
 */
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
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
  };
  concurrencyLimit: number;
  pipelineLimits?: {
    spontaneous?: number;
    sentiment?: number;
    comparison?: number;
  };
}
