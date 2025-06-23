/**
 * Type definitions for competition analysis
 */

import { Citation } from './citation.types';
import { ToolUsage } from './tool-usage.types';

export interface CompetitorAnalysis {
  competitor: string;
  analysisByModel: ModelCompetitorAnalysis[];
}

export interface ModelCompetitorAnalysis {
  model: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CompetitorMetric {
  competitor: string;
  overallRank: number;
  mentionRate: number;
  modelMentions: ModelMention[];
}

export interface ModelMention {
  model: string;
  rank: number;
  mentionRate: number;
}

export interface DetailedCompetitionResult {
  model: string;
  promptIndex: number;
  competitor: string;
  originalPrompt: string;
  llmResponse: string;
  brandStrengths: string[];
  brandWeaknesses: string[];
  competitorStrengths?: string[];
  competitorWeaknesses?: string[];
  usedWebSearch: boolean;
  citations: Citation[];
  toolUsage: ToolUsage[];
}

export interface CompetitorInsight {
  name: string;
  strengths: string[];
  weaknesses: string[];
  overallPosition: 'ahead' | 'behind' | 'equal';
}