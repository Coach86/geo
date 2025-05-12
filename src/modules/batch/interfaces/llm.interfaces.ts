/**
 * Shared LLM configuration interfaces for the batch module
 */

export interface LlmModelConfig {
  id: string;
  provider: string;
  model: string;
  enabled: boolean;
  parameters: {
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
}

export interface ModelIdentifier {
  provider: string;
  model: string;
}

export interface AnalyzerConfig {
  primary: ModelIdentifier;
  fallback: ModelIdentifier;
}

export interface PipelineConfig {
  llmModels: LlmModelConfig[];
  analyzerConfig: {
    spontaneous: AnalyzerConfig;
    sentiment: AnalyzerConfig;
    comparison: AnalyzerConfig;
  };
  concurrencyLimit: number;
}