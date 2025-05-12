/**
 * Interfaces for batch processing
 */

export interface CompanyBatchContext {
  companyId: string;
  brandName: string;
  keyFeatures: string[];
  competitors: string[];
  promptSet: any;
}

/**
 * Spontaneous Pipeline Interfaces
 */
export interface SpontaneousPipelineResult {
  llmProvider: string;
  promptIndex: number;
  mentioned: boolean;
  topOfMind: string[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
}

export interface SpontaneousResults {
  results: SpontaneousPipelineResult[];
  summary: {
    mentionRate: number;
    topMentions: string[];
  };
}

/**
 * Sentiment Pipeline Interfaces
 */
export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative' | string;
  extractedFacts: any[]; // Data from LLM can be initially varied
  accuracy: number;
}

export interface SentimentPipelineResult {
  llmProvider: string;
  promptIndex: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  accuracy: number;
  extractedFacts: string[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
}

export interface SentimentResults {
  results: SentimentPipelineResult[];
  summary: {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    averageAccuracy: number;
  };
}

/**
 * Comparison Pipeline Interfaces
 */
export interface ComparisonAnalysisResult {
  winner: string;
  differentiators: any[]; // Data from LLM can be initially varied
}

export interface ComparisonPipelineResult {
  llmProvider: string;
  promptIndex: number;
  winner: string;
  differentiators: string[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
}

export interface ComparisonResults {
  results: ComparisonPipelineResult[];
  summary: {
    winRate: number;
    keyDifferentiators: string[];
  };
}

/**
 * Weekly Report Interface
 */
export interface WeeklyBrandReport {
  companyId: string;
  weekStart: Date; // Monday 00-00-00Z
  spontaneous: SpontaneousResults;
  sentimentAccuracy: SentimentResults;
  comparison: ComparisonResults;
  llmVersions: Record<string, string>; // model identifiers
  generatedAt: Date;
}