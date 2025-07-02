import { useState, useEffect, useMemo } from "react";
import { getAggregatedAlignment } from "@/lib/api/report";
import type { ReportResponse } from "@/types/reports";
import type { AlignmentResults, DetailedAlignmentResult } from "@/types/alignment";
import { useFeatureGate } from "@/hooks/use-feature-access";

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

interface AlignmentChartDataPoint {
  date: string;
  score: number;
  reportId: string;
}

interface UseAlignmentReportsReturn {
  loading: boolean;
  error: string | null;
  averageScore: number;
  scoreVariation: number;
  chartData: AlignmentChartDataPoint[];
  aggregatedAttributeScores: Record<string, number>;
  availableModels: string[];
  detailedResults: AlignmentResults[];
  citations?: AggregatedCitations;
}

export function useAlignmentReports(
  projectId: string | null,
  selectedModels: string[],
  token: string | null,
  isAllTime: boolean = false,
  dateRange?: { startDate: Date; endDate: Date },
  isLatest: boolean = false
): UseAlignmentReportsReturn {
  const { isFreePlan } = useFeatureGate("alignment");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aggregatedData, setAggregatedData] = useState<any>(null);

  // Fetch aggregated alignment data
  useEffect(() => {
    const fetchData = async () => {
      console.log('[useAlignmentReports] Effect triggered with:', {
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
        console.log('[useAlignmentReports] Missing required data, skipping fetch');
        setAggregatedData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (isFreePlan) {
          // Generate mock data for free plan users
          const attributes = [
            "Innovation", 
            "Quality", 
            "Customer Service", 
            "Value", 
            "Reliability"
          ];
          
          const models = ["ChatGPT", "Claude", "Gemini"];
          
          // Create mock aggregated data (using dateRange for chart data)
          const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
          const mockChartData = [];
          for (let i = 0; i <= Math.min(daysDiff, 10); i++) {
            const date = new Date(dateRange.startDate.getTime() + (i * 24 * 60 * 60 * 1000 * (daysDiff / 10)));
            mockChartData.push({
              date: date.toISOString().split('T')[0],
              score: 60 + Math.random() * 25 + i * 2,
              reportId: `mock-${i}`
            });
          }
          
          const mockAggregatedData = {
            averageScore: 65 + Math.random() * 20,
            scoreVariation: Math.random() > 0.5 ? Math.floor(Math.random() * 15) : -Math.floor(Math.random() * 10),
            availableModels: models,
            chartData: mockChartData,
            aggregatedAttributeScores: Object.fromEntries(
              attributes.map(attr => [attr, 0.5 + Math.random() * 0.3])
            ),
            attributeBreakdown: attributes.map(attr => ({
              attribute: attr,
              score: 0.5 + Math.random() * 0.3,
              variation: Math.random() > 0.5 ? Math.floor(Math.random() * 10) : -Math.floor(Math.random() * 8)
            }))
          };
          
          setAggregatedData(mockAggregatedData);
        } else {
          console.log('[useAlignmentReports] Making API call with:', {
            projectId,
            isLatest,
            dateRange: dateRange ? {
              start: dateRange.startDate.toISOString(),
              end: dateRange.endDate.toISOString()
            } : null,
            models: selectedModels,
            includeVariation: !isAllTime
          });

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

          const data = await getAggregatedAlignment(projectId, token, queryParams);
          
          setAggregatedData(data);
        }
      } catch (err) {
        console.error("Failed to fetch alignment data:", err);
        setError("Failed to load alignment data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, selectedModels, token, isFreePlan, isAllTime, isLatest, projectId]);

  // Process the data
  const result = useMemo(() => {
    if (!aggregatedData) {
      return {
        loading: false,
        error: null,
        averageScore: 0,
        scoreVariation: 0,
        chartData: [],
        aggregatedAttributeScores: {},
        availableModels: [],
        detailedResults: [],
        citations: undefined
      };
    }

    return {
      loading: false,
      error: null,
      averageScore: Math.round(aggregatedData.averageScore),
      scoreVariation: aggregatedData.scoreVariation,
      chartData: aggregatedData.chartData
        // Sort by date ascending (oldest first)
        .sort((a: AlignmentChartDataPoint, b: AlignmentChartDataPoint) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
      aggregatedAttributeScores: aggregatedData.aggregatedAttributeScores || {},
      availableModels: aggregatedData.availableModels || [],
      detailedResults: [], // No detailed results from aggregated endpoint
      citations: aggregatedData.citations
    };
  }, [aggregatedData]);

  return {
    loading,
    error,
    ...result
  };
}