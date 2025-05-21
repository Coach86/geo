// Company Identity Card interfaces
export interface CompanyIdentityCard {
  id: string;
  brandName: string;
  industry: string;
  market: string;
  shortDescription: string;
  longDescription?: string;
  keyBrandAttributes: string[];
  competitors: string[];
  url?: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
  userEmail?: string | null;
  userLanguage?: string | null;
}

// User interface
export interface User {
  id: string;
  email: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  companyIds?: string[];
}

// Prompt Set interfaces
export interface PromptSet {
  id: string;
  companyId: string;
  direct: string[] | string; // Either direct string[] or for backward compatibility string JSON
  comparison: string[] | string; // Either direct string[] or for backward compatibility string JSON
  spontaneous: string[] | string; // Either direct string[] or for backward compatibility string JSON
  accuracy?: string[] | string; // Either direct string[] or for backward compatibility string JSON
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
  spontaneous: PromptTemplate;
  direct: PromptTemplate;
  comparison: PromptTemplate;
  accuracy: PromptTemplate;
  brandBattle?: PromptTemplate;
}

// Batch Execution interfaces
export interface BatchExecution {
  id: string;
  companyId: string;
  executedAt: string;
  status: 'running' | 'completed' | 'failed';
  finalResults: BatchResult[];
  identityCard?: CompanyIdentityCard;
}

// Batch type enum
export enum BatchType {
  SPONTANEOUS = 'spontaneous',
  SENTIMENT = 'sentiment',
  COMPARISON = 'comparison',
  ACCURACY = 'accuracy'
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
  };
  webSearchSummary?: WebSearchSummary;
}

export interface ComparisonPipelineResult {
  llmProvider: string;
  llmModel: string;
  promptIndex: number;
  competitor: string;  // The competitor being compared against
  brandStrengths: string[];  // Strengths of the brand vs this competitor
  brandWeaknesses: string[];  // Weaknesses of the brand vs this competitor
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

// User interface
export interface User {
  id: string;
  email: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  companyIds?: string[];
}
