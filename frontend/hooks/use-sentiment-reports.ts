"use client";

import { useMemo, useState, useEffect } from "react";
import type { ReportResponse } from "@/types/reports";
import { getAggregatedSentiment } from "@/lib/api/report";
import { getModelFriendlyName } from "@/utils/model-utils";

interface SentimentData {
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
    }[];
  }[];
}

interface CitationItem {
  domain: string;
  url: string;
  title?: string;
  // New array fields
  prompts: string[];
  sentiments?: string[];
  scores?: number[];
  models: string[];
  count: number;
  text?: string;
  
  // Legacy single-value fields for backwards compatibility
  prompt?: string;
  sentiment?: string;
  score?: number;
  model?: string;
}

interface AggregatedCitations {
  items: CitationItem[];
  uniqueDomains: number;
  totalCitations: number;
}

interface ChartDataPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
}

interface ChartDataPointWithSort extends ChartDataPoint {
  _sortDate: Date;
}

interface ChartDataOutput {
  date: string;
  score: number;
  positive: number;
  neutral: number;
  negative: number;
}

interface UseSentimentReportsReturn {
  loading: boolean;
  error: string | null;
  averageScore: number;
  scoreVariation: number | null;
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  distributionVariations: {
    positive: number | null;
    neutral: number | null;
    negative: number | null;
  };
  chartData: ChartDataOutput[];
  aggregatedHeatmap: SentimentData['heatmapData'];
  availableModels: string[];
  citations?: AggregatedCitations;
}

export function useSentimentReports(
  projectId: string | null,
  selectedModels: string[],
  token: string | null,
  isAllTime: boolean = false,
  dateRange?: { startDate: Date; endDate: Date },
  isLatest: boolean = false
): UseSentimentReportsReturn {
  const [aggregatedData, setAggregatedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch aggregated sentiment data
  useEffect(() => {
    const fetchAggregatedData = async () => {
      console.log('[useSentimentReports] Effect triggered with:', {
        hasToken: !!token,
        hasDateRange: !!dateRange,
        hasProjectId: !!projectId,
        dateRange: dateRange ? {
          start: dateRange.startDate.toISOString(),
          end: dateRange.endDate.toISOString()
        } : null,
        selectedModels: selectedModels.length,
        isAllTime
      });
      
      if (!token || (!dateRange && !isLatest) || !projectId) {
        console.log('[useSentimentReports] Missing required data, skipping fetch');
        setAggregatedData(null);
        return;
      }
      
      console.log('[useSentimentReports] Making API call with:', {
        projectId,
        isLatest,
        dateRange: dateRange ? {
          start: dateRange.startDate.toISOString(),
          end: dateRange.endDate.toISOString()
        } : null,
        models: selectedModels,
        includeVariation: !isAllTime
      });

      setLoading(true);
      setError(null);

      try {
        const queryParams: any = {
          models: selectedModels, // Send the array as-is (empty array means all models)
          includeVariation: !isAllTime, // Don't calculate variations for "All time"
        };

        if (isLatest) {
          queryParams.latestOnly = true;
        } else if (dateRange) {
          queryParams.startDate = dateRange.startDate.toISOString();
          queryParams.endDate = dateRange.endDate.toISOString();
        }

        const data = await getAggregatedSentiment(projectId, token, queryParams);
        
        console.log('useSentimentReports - API response:', data);
        console.log('useSentimentReports - citations in response:', data.citations);
        
        setAggregatedData(data);
      } catch (err) {
        console.error("Failed to fetch aggregated sentiment data:", err);
        setError("Failed to load sentiment data");
      } finally {
        setLoading(false);
      }
    };

    fetchAggregatedData();
  }, [dateRange, selectedModels, token, isAllTime, isLatest, projectId]);

  return useMemo(() => {
    if (!aggregatedData || loading) {
      return {
        loading,
        error,
        averageScore: 0,
        scoreVariation: null,
        distribution: { positive: 0, neutral: 0, negative: 0 },
        distributionVariations: { positive: null, neutral: null, negative: null },
        chartData: [],
        aggregatedHeatmap: [],
        availableModels: [],
        citations: undefined,
      };
    }

    try {
      // Calculate average score: (positive - negative) / (positive + negative + neutral)
      const positive = aggregatedData.positivePercentage || 0;
      const neutral = aggregatedData.neutralPercentage || 0;
      const negative = aggregatedData.negativePercentage || 0;
      const total = positive + neutral + negative;
      
      const averageScore = total > 0 
        ? Math.round((positive - negative) / total * 100)
        : 0;

      // Use the overall variation from the backend
      const scoreVariation = aggregatedData.overallVariation || null;
      
      console.log('[DEBUG] Sentiment variations from backend:', {
        overallVariation: aggregatedData.overallVariation,
        sentimentVariation: aggregatedData.sentimentVariation,
        sentimentBreakdown: aggregatedData.sentimentBreakdown
      });

      // Transform chart data
      const chartData = aggregatedData.chartData
        .map((point: ChartDataPoint): ChartDataPointWithSort & { score: number } => {
          const pointTotal = point.positive + point.neutral + point.negative;
          const pointScore = pointTotal > 0 
            ? Math.round((point.positive - point.negative) / pointTotal * 100)
            : 0;
            
          return {
            date: new Date(point.date).toLocaleDateString(),
            score: pointScore, // Using the formula: (positive - negative) / total
            positive: point.positive,
            neutral: point.neutral,
            negative: point.negative,
            // Keep the original date for sorting
            _sortDate: new Date(point.date),
          };
        })
        // Sort by date ascending (oldest first)
        .sort((a: ChartDataPointWithSort & { score: number }, b: ChartDataPointWithSort & { score: number }) => 
          a._sortDate.getTime() - b._sortDate.getTime()
        )
        // Remove the sorting field
        .map(({ _sortDate, ...rest }: ChartDataPointWithSort & { score: number }): ChartDataOutput => rest as ChartDataOutput);

      return {
        loading: false,
        error: null,
        averageScore,
        scoreVariation,
        distribution: {
          positive: aggregatedData.positivePercentage,
          neutral: aggregatedData.neutralPercentage,
          negative: aggregatedData.negativePercentage,
        },
        distributionVariations: {
          positive: aggregatedData.sentimentVariation?.positive || null,
          neutral: aggregatedData.sentimentVariation?.neutral || null,
          negative: aggregatedData.sentimentVariation?.negative || null,
        },
        chartData,
        aggregatedHeatmap: [], // Not available in aggregated endpoint
        availableModels: aggregatedData.availableModels || [],
        citations: aggregatedData.citations,
      };
    } catch (err) {
      console.error("Failed to process sentiment data:", err);
      return {
        loading: false,
        error: "Failed to process sentiment data",
        averageScore: 0,
        scoreVariation: null,
        distribution: { positive: 0, neutral: 0, negative: 0 },
        distributionVariations: { positive: null, neutral: null, negative: null },
        chartData: [],
        aggregatedHeatmap: [],
        availableModels: [],
        citations: undefined,
      };
    }
  }, [aggregatedData, loading, error]);
}