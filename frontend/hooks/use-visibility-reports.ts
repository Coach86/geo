"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAggregatedVisibility } from "@/lib/api/report";
import type { ReportResponse } from "@/types/reports";

interface CompetitorData {
  name: string;
  averageScore: number;
  variation: number;
}

interface DomainSourceAnalysis {
  brandDomainPercentage: number;
  otherSourcesPercentage: number;
  brandDomainCount: number;
  otherSourcesCount: number;
  competitorBreakdown?: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  unknownSourcesCount?: number;
  unknownSourcesPercentage?: number;
}

interface UseVisibilityReportsReturn {
  loading: boolean;
  error: string | null;
  averageScore: number;
  scoreVariation: number;
  competitors: CompetitorData[];
  chartData: Array<{
    date: string;
    [key: string]: string | number; // Dynamic keys for brand and competitor names
  }>;
  modelBreakdown: Array<{
    model: string;
    brandScore: number;
    competitorScores: Record<string, number>;
  }>;
  availableModels: string[];
  topMentions: Array<{
    mention: string;
    count: number;
    percentage: number;
  }>;
  topDomains: Array<{
    domain: string;
    count: number;
    percentage: number;
  }>;
  totalPromptsTested: number;
  domainSourceAnalysis?: DomainSourceAnalysis;
}

export function useVisibilityReports(
  projectId: string | null,
  selectedModels: string[],
  token: string | null,
  isAllTime: boolean = false,
  dateRange?: { startDate: Date; endDate: Date },
  isLatest: boolean = false
): UseVisibilityReportsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aggregatedData, setAggregatedData] = useState<any>(null);

  // Memoize selectedModels to prevent unnecessary re-renders
  const memoizedSelectedModels = useMemo(() => {
    return selectedModels.slice().sort(); // Create a sorted copy to ensure stability
  }, [selectedModels.join(',')]); // Only change when the actual models change

  // Fetch aggregated visibility data
  useEffect(() => {
    const fetchAggregatedData = async () => {
      console.log('[useVisibilityReports] Effect triggered with:', {
        hasToken: !!token,
        hasDateRange: !!dateRange,
        hasProjectId: !!projectId,
        dateRange: dateRange ? {
          start: dateRange.startDate.toISOString(),
          end: dateRange.endDate.toISOString()
        } : null,
        selectedModels: memoizedSelectedModels.length,
        isAllTime
      });
      
      if (!token || (!dateRange && !isLatest) || !projectId) {
        console.log('[useVisibilityReports] Missing required data, skipping fetch');
        setAggregatedData(null);
        return;
      }

      console.log('[useVisibilityReports] Making API call with:', {
        projectId,
        isLatest,
        dateRange: dateRange ? {
          start: dateRange.startDate.toISOString(),
          end: dateRange.endDate.toISOString()
        } : null,
        models: memoizedSelectedModels,
        includeVariation: !isAllTime
      });

      setLoading(true);
      setError(null);

      try {
        const queryParams: any = {
          models: memoizedSelectedModels, // Send the array as-is (empty array means all models)
          includeVariation: !isAllTime, // Don't calculate variations for "All time"
        };

        if (isLatest) {
          queryParams.latestOnly = true;
        } else if (dateRange) {
          queryParams.startDate = dateRange.startDate.toISOString();
          queryParams.endDate = dateRange.endDate.toISOString();
        }

        const data = await getAggregatedVisibility(projectId, token, queryParams);
        
        setAggregatedData(data);
      } catch (err) {
        console.error("Failed to fetch aggregated visibility data:", err);
        setError("Failed to load visibility data");
      } finally {
        setLoading(false);
      }
    };

    fetchAggregatedData();
  }, [dateRange, memoizedSelectedModels, token, isAllTime, isLatest, projectId]);

  // Process the aggregated data
  const processData = useCallback((): UseVisibilityReportsReturn => {
    if (!aggregatedData) {
      return {
        loading: false,
        error: null,
        averageScore: 0,
        scoreVariation: 0,
        competitors: [],
        chartData: [],
        modelBreakdown: [],
        availableModels: [],
        topMentions: [],
        topDomains: [],
        totalPromptsTested: 0,
        domainSourceAnalysis: undefined,
      };
    }

    // Get all competitor names from the competitors array
    const allCompetitorNames = aggregatedData.competitors?.map((c: CompetitorData) => c.name) || [];

    // Transform chart data to match existing format
    const chartData = aggregatedData.chartData
      .map((point: any) => {
        const transformedPoint: any = {
          date: new Date(point.date).toLocaleDateString(),
          dateObj: new Date(point.date), // Keep the Date object for sorting
          Brand: point.brand || 0,
        };
        
        // Add competitor data
        Object.entries(point.competitors || {}).forEach(([name, score]) => {
          transformedPoint[name] = score;
        });
        
        // Ensure all competitors are included with 0 if missing
        allCompetitorNames.forEach((competitorName: string) => {
          if (!(competitorName in transformedPoint)) {
            transformedPoint[competitorName] = 0;
          }
        });
        
        return transformedPoint;
      })
      // Sort by date in ascending order
      .sort((a: any, b: any) => a.dateObj.getTime() - b.dateObj.getTime())
      // Remove the dateObj as it's not needed in the final output
      .map(({ dateObj, ...rest }: any) => rest);

    // Process model breakdown if needed
    const modelBreakdown = aggregatedData.modelBreakdown?.map((mb: any) => ({
      model: mb.model,
      brandScore: mb.score,
      competitorScores: {}, // Backend doesn't provide this yet
    })) || [];

    return {
      loading: false,
      error: null,
      averageScore: aggregatedData.averageScore,
      scoreVariation: aggregatedData.scoreVariation,
      competitors: aggregatedData.competitors || [],
      chartData,
      modelBreakdown,
      availableModels: aggregatedData.availableModels || [],
      topMentions: aggregatedData.topMentions || [],
      topDomains: aggregatedData.topDomains || [],
      totalPromptsTested: aggregatedData.totalPromptsTested || 0,
      domainSourceAnalysis: aggregatedData.domainSourceAnalysis,
    };
  }, [aggregatedData]);

  const result = processData();
  
  return {
    loading,
    error,
    averageScore: result.averageScore,
    scoreVariation: result.scoreVariation,
    competitors: result.competitors,
    chartData: result.chartData,
    modelBreakdown: result.modelBreakdown,
    availableModels: result.availableModels,
    topMentions: result.topMentions,
    topDomains: result.topDomains,
    totalPromptsTested: result.totalPromptsTested,
    domainSourceAnalysis: result.domainSourceAnalysis,
  };
}