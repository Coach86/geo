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
  visibility: string[];
  sentiment?: string[];
  competition: string[];
  alignment?: string[];
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
  isManualRefresh?: boolean; // Indicates if this was triggered by manual refresh
  isNewProject?: boolean; // Indicates if this was triggered by new project creation
  triggerSource?: 'cron' | 'manual' | 'project_creation';
}

/**
 * Top of Mind Brand Interface
 */
export interface TopOfMindBrand {
  name: string;
  type: 'ourbrand' | 'competitor' | 'other';
  id?: string | null; // ID for deduplication (used for ourbrand and competitor types, null for other)
}

/**
 * Visibility Pipeline Interfaces
 */
export interface VisibilityPipelineResult {
  llmProvider: string;
  llmModel: string;
  promptIndex: number;
  runIndex?: number; // Index of the run for this model/prompt combination
  mentioned: boolean;
  topOfMind: TopOfMindBrand[];
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

export interface VisibilityResults {
  results: VisibilityPipelineResult[];
  summary: {
    mentionRate: number;
    topMentions: string[];
    topMentionCounts?: MentionCount[]; // Added field for mention counts
    topDomains?: Array<{
      domain: string;
      count: number;
      percentage: number;
    }>;
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
 * Alignment Pipeline Interfaces
 */
export interface AttributeAlignmentScore {
  attribute: string;
  score: number;
  evaluation: string;
}

export interface AlignmentPipelineResult {
  llmProvider: string;
  llmModel: string;
  promptIndex: number;
  attributeScores: AttributeAlignmentScore[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  // Added fields for web search and citations
  usedWebSearch?: boolean;
  citations?: any[];
  toolUsage?: any[];
}

export interface AlignmentResults {
  results: AlignmentPipelineResult[];
  summary: {
    averageAttributeScores: Record<string, number>;
  };
  webSearchSummary: WebSearchSummary;
}

/**
 * Competition Pipeline Interfaces
 */
export interface CompetitionAnalysisResult {
  winner: string;
  differentiators: any[]; // Data from LLM can be initially varied
}

export interface CompetitionPipelineResult {
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

export interface CompetitionResults {
  results: CompetitionPipelineResult[];
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

// Alias for backward compatibility, using the same structure as CompetitionPipelineResult
export type BrandBattlePipelineResult = CompetitionPipelineResult;

// Alias for backward compatibility, using the same structure as CompetitionResults
export type BrandBattleResults = CompetitionResults;

/**
 * Weekly Report Interface
 */
export interface WeeklyBrandReport {
  projectId: string;
  date: Date; // Monday 00-00-00Z
  visibility: VisibilityResults;
  sentiment: SentimentResults;
  alignment?: AlignmentResults; // New field for alignment results
  competition: CompetitionResults; // Now contains the brand battle data
  // Note: brandBattle field removed as it's now integrated into competition
  llmVersions: Record<string, string>; // model identifiers
  generatedAt: Date;
}

// Export aliases for backward compatibility
export type SpontaneousResults = VisibilityResults;
export type SpontaneousPipelineResult = VisibilityPipelineResult;
export type AccuracyResults = AlignmentResults;
export type AccuracyPipelineResult = AlignmentPipelineResult;
export type ComparisonResults = CompetitionResults;
export type ComparisonPipelineResult = CompetitionPipelineResult;
