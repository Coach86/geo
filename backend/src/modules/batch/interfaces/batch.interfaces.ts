/**
 * Interfaces for batch processing
 */

export interface CompanyBatchContext {
  companyId: string;
  brandName: string;
  keyBrandAttributes: string[];
  competitors: string[];
  promptSet: any;
  batchExecutionId?: string; // Optional ID of associated batch execution for storing raw responses
}

/**
 * Spontaneous Pipeline Interfaces
 */
export interface SpontaneousPipelineResult {
  llmProvider: string;
  llmModel: string;
  promptIndex: number;
  runIndex?: number; // Index of the run for this model/prompt combination
  mentioned: boolean;
  topOfMind: string[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  // Added fields for web search and citations
  usedWebSearch?: boolean;
  citations?: any[];
  toolUsage?: any[];
  llmResponseObj?: any; // Complete response object with provider-specific metadata
}

export interface WebSearchSummary {
  usedWebSearch: boolean;
  webSearchCount: number;
  consultedWebsites: string[];
}

export interface ModelBreakdown {
  name: string; // Model name (e.g., "Claude 3", "ChatGPT-4o")
  mentionRate: number; // Percentage as decimal (e.g., 0.7 for 70%)
  promptsTested: number; // Number of prompts tested with this model (including repeats)
  runs: number; // Number of runs executed for this model
}

export interface BrandVisibilitySummary {
  globalMentionRate: number; // Overall mention rate across all models
  promptsTested: number; // Total number of distinct prompts tested
  totalRuns: number; // Total runs across all models and prompts
  modelBreakdown: ModelBreakdown[]; // Per-model breakdown data
}

export interface SpontaneousResults {
  results: SpontaneousPipelineResult[];
  summary: {
    mentionRate: number;
    topMentions: string[];
  };
  webSearchSummary: WebSearchSummary;
  brandVisibility?: BrandVisibilitySummary; // New field for UI dashboard data
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
  llmModel: string;
  promptIndex: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  accuracy: number;
  extractedFacts: string[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  // Added fields for web search and citations
  usedWebSearch?: boolean;
  citations?: any[];
  toolUsage?: any[];
}

export interface SentimentResults {
  results: SentimentPipelineResult[];
  summary: {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    averageAccuracy: number;
  };
  webSearchSummary: WebSearchSummary;
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
  llmModel: string;
  promptIndex: number;
  winner: string;
  differentiators: string[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  // Added fields for web search and citations
  usedWebSearch?: boolean;
  citations?: any[];
  toolUsage?: any[];
}

export interface ComparisonResults {
  results: ComparisonPipelineResult[];
  summary: {
    winRate: number;
    keyDifferentiators: string[];
  };
  webSearchSummary: WebSearchSummary;
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
