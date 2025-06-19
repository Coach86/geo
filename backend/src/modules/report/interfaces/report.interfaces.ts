// Metadata structure
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

// Explorer data - citations and web access
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
  webSearchResults?: {
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
  }[]; // New structure: query -> citations
  webAccess: {
    totalResponses: number;
    successfulQueries: number;
    failedQueries: number;
  };
}

// Visibility data - brand mention rates
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
}

// Sentiment data - tone analysis
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
      citations?: any[];
      toolUsage?: any[];
    }[];
  }[];
}

// Alignment data - brand attribute alignment
export interface AlignmentData {
  overallAlignmentScore: number;
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

// Competition data - competitor analysis
export interface CompetitionData {
  brandName: string;
  competitors: string[];
  // Frontend expects competitorAnalyses with analysisByModel
  competitorAnalyses: {
    competitor: string;
    analysisByModel: {
      model: string;
      strengths: string[];
      weaknesses: string[];
    }[];
  }[];
  // Additional competitor metrics for arena view
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
}

// Main report structure
export interface ReportStructure {
  // Metadata fields
  id: string;
  projectId: string;
  reportDate: Date;
  generatedAt: Date;
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