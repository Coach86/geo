/**
 * Type definitions for BrandReport documents
 */

import { Citation } from './citation.types';
import { ToolUsage } from './tool-usage.types';

export interface ModelVisibilityItem {
  model: string;
  mentionRate: number;
}

export interface ArenaMetric {
  name: string;
  global: string; // e.g., "48%"
  modelsMentionsRate?: Array<{
    model: string;
    mentionsRate: number;
  }>;
}

export interface VisibilityData {
  overallMentionRate: number;
  promptsTested: number;
  modelVisibility: ModelVisibilityItem[];
  arenaMetrics: ArenaMetric[];
  topMentions?: Array<{
    mention: string;
    count: number;
  }>;
  topDomains?: Array<{
    domain: string;
    count: number;
    percentage: number;
  }>;
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
  citations: Citation[];
  toolUsage: ToolUsage[];
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
  citations: Citation[];
  toolUsage: ToolUsage[];
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
  domainSourceAnalysis?: {
    brandDomainPercentage: number;
    otherSourcesPercentage: number;
    brandDomainCount: number;
    otherSourcesCount: number;
  };
}

export interface BrandReportExplorerSelect {
  id: string;
  reportDate: Date;
  generatedAt: Date;
  explorer: ExplorerData;
}