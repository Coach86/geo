import { Citation } from '../types/citation.types';
import { ToolUsage } from '../types/tool-usage.types';
import { VisibilityDataBuilder } from '../types/report-builder.types';

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
  domainSourceAnalysis?: {
    brandDomainPercentage: number;
    otherSourcesPercentage: number;
    brandDomainCount: number;
    otherSourcesCount: number;
    competitorBreakdown?: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
    unknownSourcesCount?: number;
    unknownSourcesPercentage?: number;
  };
  brandMentionMetrics?: {
    citationsWithBrandMentions: number;
    totalCitationsAnalyzed: number;
    brandMentionRate: number;
    topDomainsWithBrandMentions: {
      domain: string;
      mentionCount: number;
      totalCount: number;
      mentionRate: number;
    }[];
    brandMentionsByModel: {
      model: string;
      mentionCount: number;
      totalCitations: number;
      mentionRate: number;
    }[];
  };
}

// Visibility data - brand mention rates
export interface VisibilityData {
  brandName: string;
  mentionRate: number;
  topMentions: {
    mention: string;
    count: number;
  }[];
  competitorRanks: {
    competitor: string;
    count: number;
    rank: number;
  }[];
  modelVisibility: {
    model: string;
    mentioned: boolean;
    brandMentionCount: number;
    topOtherMentions: {
      company: string;
      count: number;
    }[];
  }[];
  arenaMetrics: {
    mentionRate: number;
    avgRank: number;
    modelsMentioningBrand: number;
    totalModels: number;
  };
  allMentionedCompanies: string[];
  detailedResults?: {
    model: string;
    promptIndex: number;
    brandMentioned: boolean;
    extractedCompanies: string[];
    originalPrompt: string;
    llmResponse: string;
    usedWebSearch: boolean;
    citations: Citation[];
    toolUsage: ToolUsage[];
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
      citations?: Citation[];
      toolUsage?: ToolUsage[];
    }[];
  }[];
  detailedResults?: {
    model: string;
    promptIndex: number;
    originalPrompt: string;
    llmResponse: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    extractedPositiveKeywords: string[];
    extractedNegativeKeywords: string[];
    usedWebSearch: boolean;
    citations: Citation[];
    toolUsage: ToolUsage[];
  }[];
}

// Alignment data - brand attribute alignment
export interface AlignmentData {
  summary: {
    overallAlignmentScore: number;
    averageAttributeScores: Record<string, number>;
    attributeAlignmentSummary: {
      name: string;
      mentionRate: string;
      alignment: string;
    }[];
  };
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
    citations?: Citation[];
    toolUsage?: ToolUsage[];
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
  // Detailed results with citations
  detailedResults?: {
    model: string;
    promptIndex: number;
    competitor: string;
    originalPrompt: string;
    llmResponse: string;
    brandStrengths: string[];
    brandWeaknesses: string[];
    usedWebSearch: boolean;
    citations: {
      url: string;
      title?: string;
      text?: string;
    }[];
    toolUsage: {
      type: string;
      parameters?: Record<string, unknown>;
      execution_details?: {
        status: string;
        result?: unknown;
        error?: string;
      };
    }[];
  }[];
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
  visibility: VisibilityData | VisibilityDataBuilder; // Support both stored and builder formats
  sentiment: SentimentData;
  alignment: AlignmentData;
  competition: CompetitionData;
}