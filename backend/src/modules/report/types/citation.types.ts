/**
 * Type definitions for citations across different report types
 */

export interface Citation {
  url: string;
  title?: string;
  text?: string;
  domain?: string;
  source?: string;
  website?: string;
  link?: string;
  model?: string;
  promptType?: string;
  promptIndex?: number;
  brandMentioned?: boolean;
  brandMentionContext?: string;
}

export interface CitationWithMetadata extends Citation {
  originalPrompt?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  score?: number;
  modelMentions?: string[];
}

export interface AggregatedCitation {
  url: string;
  domain: string;
  title?: string;
  count: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  prompts: string[];
  modelMentions: string[];
  snippets?: string[];
}

export interface CitationMap {
  [key: string]: AggregatedCitation;
}