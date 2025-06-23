/**
 * Type definitions for visibility analysis
 */

import { Citation } from './citation.types';
import { ToolUsage } from './tool-usage.types';

export interface DetailedVisibilityResult {
  model: string;
  promptIndex: number;
  brandMentioned: boolean;
  extractedCompanies: string[];
  originalPrompt: string;
  llmResponse: string;
  usedWebSearch: boolean;
  citations: Citation[];
  toolUsage: ToolUsage[];
}

export interface TopMention {
  mention: string;
  count: number;
  percentage?: number;
}

export interface CompetitorRank {
  competitor: string;
  count: number;
  rank: number;
}

export interface ModelVisibilityResult {
  model: string;
  mentioned: boolean;
  brandMentionCount: number;
  mentionRate?: number;
  topOtherMentions: TopMention[];
}

export interface ArenaMetrics {
  mentionRate: number;
  avgRank: number;
  modelsMentioningBrand: number;
  totalModels: number;
}

export interface VisibilityChartData {
  date: string;
  mentionRate: number;
  modelCount: number;
}