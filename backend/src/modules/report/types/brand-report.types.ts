/**
 * Type definitions for BrandReport documents
 */

export interface ModelVisibilityItem {
  model: string;
  mentionRate: number;
}

export interface ArenaMetric {
  name: string;
  size: string;
  global: string; // e.g., "48%"
}

export interface VisibilityData {
  overallMentionRate: number;
  promptsTested: number;
  modelVisibility: ModelVisibilityItem[];
  arenaMetrics: ArenaMetric[];
}

export interface AttributeScore {
  attribute: string;
  score: number;
  evaluation: string;
}

export interface DetailedAlignmentResult {
  model: string;
  promptIndex: number;
  originalPrompt: string;
  llmResponse: string;
  attributeScores: AttributeScore[];
  citations: any[];
  toolUsage: any[];
}

export interface AlignmentData {
  summary: {
    overallAlignmentScore: number;
    averageAttributeScores: Record<string, number>;
    attributeAlignmentSummary: Array<{
      name: string;
      mentionRate: string;
      alignment: string;
    }>;
  };
  detailedResults: DetailedAlignmentResult[];
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface DetailedSentimentResult {
  model: string;
  promptIndex: number;
  originalPrompt: string;
  llmResponse: string;
  sentimentBreakdown: SentimentBreakdown;
  overallSentiment: 'positive' | 'neutral' | 'negative';
  keywords: {
    positive: string[];
    negative: string[];
  };
  citations: any[];
  toolUsage: any[];
}

export interface SentimentData {
  overallScore: number;
  overallSentiment: string;
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  modelSentiments: Array<{
    model: string;
    sentiment: string;
    status: string;
    positiveKeywords: string[];
    negativeKeywords: string[];
  }>;
  heatmapData: Array<{
    question: string;
    results: Array<{
      model: string;
      sentiment: string;
      status: string;
      llmResponse?: string;
    }>;
  }>;
  detailedResults?: DetailedSentimentResult[];
}

export interface BrandReportVisibilitySelect {
  id: string;
  reportDate: Date;
  generatedAt: Date;
  visibility: VisibilityData;
}

export interface BrandReportAlignmentSelect {
  id: string;
  reportDate: Date;
  generatedAt: Date;
  alignment: AlignmentData;
}

export interface BrandReportSentimentSelect {
  id: string;
  reportDate: Date;
  generatedAt: Date;
  sentiment: SentimentData;
}

export interface ExplorerData {
  summary: {
    totalPrompts: number;
    promptsWithWebAccess: number;
    webAccessPercentage: number;
    totalCitations: number;
    uniqueSources: number;
  };
  topMentions: { mention: string; count: number }[];
  topKeywords: { keyword: string; count: number; percentage: number }[];
  topSources: { domain: string; count: number; percentage: number }[];
  citations?: {
    website: string;
    link?: string;
    model: string;
    promptType: string;
    promptIndex: number;
    promptText?: string;
    webSearchQueries?: { query: string; timestamp?: string }[];
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
  }[];
  webAccess: {
    totalResponses: number;
    successfulQueries: number;
    failedQueries: number;
  };
}

export interface BrandReportExplorerSelect {
  id: string;
  reportDate: Date;
  generatedAt: Date;
  explorer: ExplorerData;
}