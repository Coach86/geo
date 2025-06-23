/**
 * Type definitions for sentiment analysis
 */

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface SentimentKeywords {
  positive: string[];
  negative: string[];
}

export interface ModelSentimentResult {
  model: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  status: 'green' | 'yellow' | 'red';
  positiveKeywords: string[];
  negativeKeywords: string[];
}

export interface SentimentHeatmapResult {
  model: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  status: 'green' | 'yellow' | 'red';
  llmResponse?: string;
  citations?: Citation[];
  toolUsage?: ToolUsage[];
}

export interface DetailedSentimentResult {
  model: string;
  promptIndex: number;
  originalPrompt: string;
  llmResponse: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentBreakdown?: SentimentBreakdown;
  overallSentiment?: 'positive' | 'neutral' | 'negative';
  keywords?: SentimentKeywords;
  extractedPositiveKeywords?: string[];
  extractedNegativeKeywords?: string[];
  usedWebSearch?: boolean;
  citations: Citation[];
  toolUsage: ToolUsage[];
}

// Import required types
import { Citation } from './citation.types';
import { ToolUsage } from './tool-usage.types';