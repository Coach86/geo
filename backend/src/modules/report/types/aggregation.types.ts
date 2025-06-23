/**
 * Type definitions for report aggregation results
 */

import { Citation } from './citation.types';

export interface VariationData {
  value: number;
  trend: 'up' | 'down' | 'stable';
  percentage: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface CompetitorChartData {
  competitor: string;
  data: ChartDataPoint[];
}

export interface ModelPerformanceData {
  model: string;
  performance: number;
  count: number;
}

export interface AggregatedMetric {
  current: number;
  previous?: number;
  variation?: VariationData;
  breakdown?: Record<string, number>;
}

export interface ReportFetchOptions {
  projectId: string;
  reportIds: string[];
  latestOnly: boolean;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface CitationAggregationResult {
  items: Citation[];
  uniqueDomains: number;
  totalCitations: number;
}