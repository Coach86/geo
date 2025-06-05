/**
 * Interfaces for batch processing
 */

/**
 * Type definition for prompt set based on the schema definition
 * in backend/src/modules/prompt/schemas/prompt-set.schema.ts
 */
export interface PromptSetType {
  id?: string;
  projectId?: string;
  spontaneous: string[];
  direct?: string[];
  comparison: string[];
  accuracy?: string[];
  brandBattle?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProjectBatchContext {
  projectId: string;
  brandName: string;
  keyBrandAttributes: string[];
  market: string;
  websiteUrl: string;
  competitors: string[];
  promptSet: PromptSetType;
  batchExecutionId?: string; // Optional ID of associated batch execution for storing raw responses
  organizationId?: string; // Organization ID to get selected models
  selectedModels?: string[]; // Organization's selected AI models
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

export interface WebsiteCount {
  domain: string;
  count: number;
}

export interface WebSearchSummary {
  usedWebSearch: boolean;
  webSearchCount: number;
  consultedWebsites: string[];
  consultedWebsiteCounts?: WebsiteCount[]; // New field with domain counts
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

export interface MentionCount {
  mention: string;
  count: number;
}

export interface SpontaneousResults {
  results: SpontaneousPipelineResult[];
  summary: {
    mentionRate: number;
    topMentions: string[];
    topMentionCounts?: MentionCount[]; // Added field for mention counts
  };
  webSearchSummary: WebSearchSummary;
  brandVisibility?: BrandVisibilitySummary; // Field for UI dashboard data
}

/**
 * Sentiment Pipeline Interfaces
 */
export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative' | string;
  extractedPositiveKeywords: string[];
  extractedNegativeKeywords: string[];
  accuracy: number;
}

export interface SentimentPipelineResult {
  llmProvider: string;
  llmModel: string;
  promptIndex: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  accuracy: number;
  extractedPositiveKeywords: string[];
  extractedNegativeKeywords: string[];
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
    overallSentimentPercentage: number;
  };
  webSearchSummary: WebSearchSummary;
}

/**
 * Accuracy Pipeline Interfaces
 */
export interface AttributeAccuracyScore {
  attribute: string;
  score: number;
  evaluation: string;
}

export interface AccuracyPipelineResult {
  llmProvider: string;
  llmModel: string;
  promptIndex: number;
  attributeScores: AttributeAccuracyScore[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  // Added fields for web search and citations
  usedWebSearch?: boolean;
  citations?: any[];
  toolUsage?: any[];
}

export interface AccuracyResults {
  results: AccuracyPipelineResult[];
  summary: {
    averageAttributeScores: Record<string, number>;
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
  competitor: string; // The specific competitor for this comparison
  brandStrengths: string[]; // Strengths of the brand vs this competitor
  brandWeaknesses: string[]; // Weaknesses of the brand vs this competitor
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  // Web search and citation fields
  usedWebSearch?: boolean;
  citations?: any[];
  toolUsage?: any[];
}

export interface ComparisonResults {
  results: ComparisonPipelineResult[];
  summary: {
    competitorAnalyses: BrandBattleAnalysis[];
    commonStrengths: string[];
    commonWeaknesses: string[];
  };
  webSearchSummary: WebSearchSummary;
}

/**
 * Brand Battle Pipeline Interfaces
 */
export interface BrandBattleAnalysis {
  competitor: string;
  brandStrengths: string[]; // Strengths of the brand vs this competitor
  brandWeaknesses: string[]; // Weaknesses of the brand vs this competitor
}

// Alias for backward compatibility, using the same structure as ComparisonPipelineResult
export type BrandBattlePipelineResult = ComparisonPipelineResult;

// Alias for backward compatibility, using the same structure as ComparisonResults
export type BrandBattleResults = ComparisonResults;

/**
 * Weekly Report Interface
 */
export interface WeeklyBrandReport {
  projectId: string;
  date: Date; // Monday 00-00-00Z
  spontaneous: SpontaneousResults;
  sentimentAccuracy: SentimentResults;
  accuracy?: AccuracyResults; // New field for accuracy results
  comparison: ComparisonResults; // Now contains the brand battle data
  // Note: brandBattle field removed as it's now integrated into comparison
  llmVersions: Record<string, string>; // model identifiers
  generatedAt: Date;
}
