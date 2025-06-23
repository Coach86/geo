/**
 * Type definitions for alignment analysis
 */

import { Citation } from './citation.types';
import { ToolUsage } from './tool-usage.types';

export interface AttributeScore {
  attribute: string;
  score: number;
  evaluation: string;
  mentioned?: boolean;
}

export interface DetailedAlignmentResult {
  model: string;
  promptIndex?: number;
  originalPrompt?: string;
  llmResponse?: string;
  attributeScores: AttributeScore[];
  usedWebSearch?: boolean;
  citations?: Citation[];
  toolUsage?: ToolUsage[];
  error?: string;
}

export interface AttributeAlignmentSummary {
  name: string;
  mentionRate: string;
  alignment: string;
}

export interface AlignmentChartData {
  date: string;
  score: number;
  attributes: Record<string, number>;
}