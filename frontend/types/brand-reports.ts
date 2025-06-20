// New Brand Report Structure Types

export interface ReportMetadata {
  url: string;
  market: string;
  countryCode: string;
  competitors: string[];
  modelsUsed: string[];
  promptsExecuted: number;
  executionContext: {
    batchId?: string;
    pipeline: string;
    version: string;
  };
}

export interface WebSearchResult {
  query: string;
  timestamp?: string;
  models: string[];
  promptTypes: string[];
  citations: {
    website: string;
    link?: string;
    model: string;
    promptType: string;
    promptIndex: number;
    source?: string;
  }[];
}

export interface ExplorerData {
  summary: {
    totalPrompts: number;
    promptsWithWebAccess: number;
    webAccessPercentage: number;
    totalCitations: number;
    uniqueSources: number;
  };
  topMentions: {
    mention: string;
    count: number;
  }[];
  topKeywords: {
    keyword: string;
    count: number;
    percentage: number;
  }[];
  topSources: {
    domain: string;
    count: number;
    percentage: number;
  }[];
  citations: {
    website: string;
    link?: string;
    model: string;
    promptType: string;
    promptIndex: number;
    promptText?: string;
    webSearchQueries?: {
      query: string;
      timestamp?: string;
    }[];
  }[];
  webSearchResults?: WebSearchResult[]; // New structure
  webAccess: {
    totalResponses: number;
    successfulQueries: number;
    failedQueries: number;
  };
}

export interface VisibilityData {
  overallMentionRate: number;
  promptsTested: number;
  modelVisibility: {
    model: string;
    mentionRate: number;
  }[];
  // Arena metrics extracted for visibility page - competitor comparison data
  arenaMetrics: {
    name: string;
    size?: 'lg' | 'md' | 'sm';
    global?: string;
    modelsMentionsRate?: Array<{
      model: string;
      mentionsRate: number;
    }>;
  }[];
  topMentions?: {
    mention: string;
    count: number;
  }[];
}

export interface SentimentData {
  overallScore: number;
  overallSentiment: 'positive' | 'neutral' | 'negative';
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  modelSentiments: {
    model: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    status: 'green' | 'yellow' | 'red';
    positiveKeywords: string[];
    negativeKeywords: string[];
  }[];
  heatmapData: {
    question: string;
    results: {
      model: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      status: 'green' | 'yellow' | 'red';
      llmResponse?: string;
    }[];
  }[];
}

export interface AlignmentData {
  overallAlignmentScore: number; // Percentage value 0-100
  averageAttributeScores: Record<string, number>;
  attributeAlignmentSummary: {
    name: string;
    mentionRate: string;
    alignment: string;
  }[];
  detailedResults: {
    model: string;
    promptIndex?: number;
    originalPrompt?: string;
    llmResponse?: string;
    attributeScores: {
      attribute: string;
      score: number;
      evaluation: string;
    }[];
    usedWebSearch?: boolean;
    citations?: any[];
    toolUsage?: any[];
    error?: string;
  }[];
}

export interface CompetitionData {
  brandName: string;
  competitors: string[];
  competitorAnalyses: {
    competitor: string;
    analysisByModel: {
      model: string;
      strengths: string[];
      weaknesses: string[];
    }[];
  }[];
  competitorMetrics: {
    competitor: string;
    overallRank: number;
    mentionRate: number;
    modelMentions: {
      model: string;
      rank: number;
      mentionRate: number;
    }[];
  }[];
  commonStrengths: string[];
  commonWeaknesses: string[];
  detailedResults?: {
    model: string;
    promptIndex: number;
    competitor: string;
    originalPrompt: string;
    llmResponse: string;
    brandStrengths: string[];
    brandWeaknesses: string[];
    usedWebSearch?: boolean;
    citations?: {
      url: string;
      title?: string;
      text?: string;
    }[];
    toolUsage?: {
      type: string;
      parameters?: any;
      execution_details?: {
        status: string;
        result?: any;
        error?: string;
      };
    }[];
  }[];
  citations?: {
    items: any[];
    uniqueDomains: number;
    totalCitations: number;
  };
}

// Main Brand Report Structure
export interface BrandReport {
  // Metadata fields
  id: string;
  projectId: string;
  reportDate: string;
  generatedAt: string;
  batchExecutionId?: string;
  brandName: string;
  metadata: ReportMetadata;
  
  // Main analysis fields
  explorer: ExplorerData;
  visibility: VisibilityData;
  sentiment: SentimentData;
  alignment: AlignmentData;
  competition: CompetitionData;
}

// For list views - minimal report data
export interface BrandReportSummary {
  id: string;
  projectId: string;
  reportDate: string;
  generatedAt: string;
  brandName: string;
}