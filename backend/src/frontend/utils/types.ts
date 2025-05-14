// Company Identity Card interfaces
export interface CompanyIdentityCard {
  id: string;
  brandName: string;
  industry: string;
  market: string;
  shortDescription: string;
  longDescription?: string;
  keyFeatures: string[];
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
  createdAt: string;
  updatedAt: string;
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

export interface BatchResult {
  id: string;
  batchExecutionId: string;
  resultType: 'spontaneous' | 'sentiment' | 'comparison';
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
  llmProvider: string;
  promptType: 'spontaneous' | 'direct' | 'comparison';
  promptIndex: number;
  response: string;
  createdAt: string;
  citations?: string | SourceCitation[]; // Either JSON string or direct array of citations
  toolUsage?: string | ToolUseInfo[]; // Either JSON string or direct array of tool usage
  usedWebSearch?: boolean;
  responseMetadata?: string | any; // Either JSON string or direct object
}

// Batch process result interfaces
export interface SpontaneousPipelineResult {
  llmProvider: string;
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

export interface WebSearchSummary {
  usedWebSearch: boolean;
  webSearchCount: number;
  consultedWebsites: string[];
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

export interface SpontaneousResults {
  results: SpontaneousPipelineResult[];
  summary: {
    mentionRate: number;
    topMentions: string[];
  };
  webSearchSummary?: WebSearchSummary;
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
    averageAccuracy: number;
  };
  webSearchSummary?: WebSearchSummary;
}

export interface ComparisonPipelineResult {
  llmProvider: string;
  promptIndex: number;
  winner: string;
  differentiators: string[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  // Web search related fields
  usedWebSearch?: boolean;
  citations?: SourceCitation[];
  toolUsage?: ToolUseInfo[];
  webSearchQueries?: WebSearchQuery[]; // Added for direct access to web search queries
}

export interface ComparisonResults {
  results: ComparisonPipelineResult[];
  summary: {
    winRate: number;
    keyDifferentiators: string[];
  };
  webSearchSummary?: WebSearchSummary;
}

export interface BatchProcessResults {
  spontaneous?: SpontaneousResults;
  sentiment?: SentimentResults;
  comparison?: ComparisonResults;
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
