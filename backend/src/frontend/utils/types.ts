// Project interfaces
export interface Project {
  id: string;
  name?: string;
  brandName: string;
  industry: string;
  market: string;
  language?: string;
  shortDescription: string;
  longDescription?: string;
  keyBrandAttributes: string[];
  competitors: string[];
  competitorDetails?: Array<{
    name: string;
    website?: string;
  }>;
  url?: string;
  logo?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

// User interface
export interface User {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  organizationId?: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
    maxSpontaneousPrompts?: number;
    maxUrls: number;
    maxCompetitors: number;
    maxUsers: number;
  };
  selectedModels: string[];
  createdAt: string;
  updatedAt: string;
  projectIds?: string[];
}

// AI Model interface for admin
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
}

// Plan interfaces
export interface PlanPriceDto {
  monthly: number;
  yearly: number;
  currency: string;
}

export interface PlanResponseDto {
  id: string;
  name: string;
  tag: string;
  subtitle: string;
  included: string[];
  stripeProductId: string;
  maxModels: number;
  maxProjects: number;
  maxUrls: number;
  maxSpontaneousPrompts: number;
  maxCompetitors: number;
  maxUsers: number;
  refreshFrequency: string;
  isActive: boolean;
  isRecommended: boolean;
  isMostPopular: boolean;
  order: number;
  metadata: Record<string, any>;
  prices?: PlanPriceDto;
  shopifyMonthlyPrice?: number;
  shopifyAnnualPrice?: number;
  shopifyTrialDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Prompt Set interfaces
export interface PromptSet {
  id: string;
  projectId: string;
  sentiment: string[] | string; // Either direct string[] or for backward compatibility string JSON
  competition: string[] | string; // Either direct string[] or for backward compatibility string JSON
  visibility: string[] | string; // Either direct string[] or for backward compatibility string JSON
  alignment?: string[] | string; // Either direct string[] or for backward compatibility string JSON
  brandBattle?: string[] | string; // Either direct string[] or for backward compatibility string JSON
  createdAt: string;
  updatedAt: string;
}

// Prompt Template interfaces
export interface PromptTemplate {
  systemPrompt: string;
  userPrompt: string;
}

export interface PromptTemplates {
  visibility: PromptTemplate;
  sentiment: PromptTemplate;
  competition: PromptTemplate;
  alignment: PromptTemplate;
  brandBattle?: PromptTemplate;
}

// Batch Execution interfaces
export interface BatchExecution {
  id: string;
  projectId: string;
  executedAt: string;
  status: 'running' | 'completed' | 'failed';
  finalResults: BatchResult[];
  project?: Project;
}

// Batch type enum
export enum BatchType {
  VISIBILITY = 'visibility',
  SENTIMENT = 'sentiment',
  COMPETITION = 'competition',
  ALIGNMENT = 'alignment',
  // Legacy values for backward compatibility
  SPONTANEOUS = 'spontaneous',
  COMPARISON = 'comparison',
  ACCURACY = 'accuracy',
}

export interface BatchResult {
  id: string;
  batchExecutionId: string;
  resultType: BatchType | string; // Support both enum and string for backward compatibility
  result: string | any; // Either JSON string or direct object
  createdAt: string;

  // Helper method to get parsed result
  parsedResult?: () => any;
}

export interface SourceCitation {
  type?: string;
  url: string;
  title: string;
  text?: string;
}

export interface ToolUseInfo {
  id: string;
  type: string;
  parameters?: any;
  execution_details?: {
    status: string;
    timestamp: string;
  };
}

export interface RawResponse {
  id: string;
  batchExecutionId: string;
  promptType: 'spontaneous' | 'direct' | 'comparison' | 'accuracy' | 'brand-battle';
  promptIndex: number;
  originalPrompt: string;
  llmResponse: string;
  llmResponseModel: string;
  analyzerPrompt?: string;
  analyzerResponse?: any;
  analyzerResponseModel?: string;
  createdAt: string;
  updatedAt: string;
}

// Batch process result interfaces
export interface SpontaneousPipelineResult {
  llmProvider: string;
  llmModel: string;
  promptIndex: number;
  mentioned: boolean;
  topOfMind: string[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  // Web search related fields
  usedWebSearch?: boolean;
  citations?: SourceCitation[];
  toolUsage?: ToolUseInfo[];
  webSearchQueries?: WebSearchQuery[]; // Added for direct access to web search queries
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

export interface WebSearchQuery {
  query: string;
  status: string;
  timestamp: string;
  provider: string;
}

export interface ProviderWebSearchQueries {
  provider: string;
  queries: WebSearchQuery[];
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
  webSearchSummary?: WebSearchSummary;
}

export interface SentimentPipelineResult {
  llmProvider: string;
  promptIndex: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  extractedPositiveKeywords: string[];
  extractedNegativeKeywords: string[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  // Web search related fields
  usedWebSearch?: boolean;
  citations?: SourceCitation[];
  toolUsage?: ToolUseInfo[];
  webSearchQueries?: WebSearchQuery[]; // Added for direct access to web search queries
}

export interface SentimentResults {
  results: SentimentPipelineResult[];
  summary: {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    overallSentimentPercentage: number;
  };
  webSearchSummary?: WebSearchSummary;
}

export interface ComparisonPipelineResult {
  llmProvider: string;
  llmModel: string;
  promptIndex: number;
  competitor: string; // The competitor being compared against
  brandStrengths: string[]; // Strengths of the brand vs this competitor
  brandWeaknesses: string[]; // Weaknesses of the brand vs this competitor
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  // Web search related fields
  usedWebSearch?: boolean;
  citations?: SourceCitation[];
  toolUsage?: ToolUseInfo[];
  webSearchQueries?: WebSearchQuery[];
}

export interface BrandBattleAnalysis {
  competitor: string;
  brandStrengths: string[];
  brandWeaknesses: string[];
}

export interface ComparisonResults {
  results: ComparisonPipelineResult[];
  summary: {
    competitorAnalyses: BrandBattleAnalysis[];
    commonStrengths: string[];
    commonWeaknesses: string[];
  };
  webSearchSummary?: WebSearchSummary;
}

export interface AttributeAccuracyScore {
  attribute: string;
  score: number;
  evaluation: string;
}

export interface AccuracyPipelineResult {
  llmProvider: string;
  promptIndex: number;
  attributeScores: AttributeAccuracyScore[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  // Web search related fields
  usedWebSearch?: boolean;
  citations?: SourceCitation[];
  toolUsage?: ToolUseInfo[];
  webSearchQueries?: WebSearchQuery[];
}

export interface AccuracyResults {
  results: AccuracyPipelineResult[];
  summary: {
    averageAttributeScores: Record<string, number>;
  };
  webSearchSummary?: WebSearchSummary;
}

export interface BatchProcessResults {
  spontaneous?: SpontaneousResults;
  sentiment?: SentimentResults;
  comparison?: ComparisonResults;
  accuracy?: AccuracyResults;
}
