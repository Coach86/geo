"use client";

import { useState, useEffect, useCallback } from "react";
import { getAggregatedVisibility } from "@/lib/api/report";
import type { ReportResponse } from "@/types/reports";

interface CompetitorData {
  name: string;
  averageScore: number;
  variation: number;
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
}

export function useVisibilityReports(
  reports: ReportResponse[],
  selectedModels: string[],
  token: string | null
): UseVisibilityReportsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aggregatedData, setAggregatedData] = useState<any>(null);

  // Fetch aggregated visibility data
  useEffect(() => {
    const fetchAggregatedData = async () => {
      if (!token || reports.length === 0) {
        setAggregatedData(null);
        return;
      }

      // Get project ID from the first report
      const projectId = reports[0].projectId;
      
      // Sort reports to get date range
      const sortedReports = [...reports].sort(
        (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
      );
      
      const startDate = sortedReports[0].generatedAt;
      const endDate = sortedReports[sortedReports.length - 1].generatedAt;

      setLoading(true);
      setError(null);

      try {
        const data = await getAggregatedVisibility(projectId, token, {
          startDate,
          endDate,
          models: selectedModels, // Send the array as-is (empty array means all models)
          includeVariation: true,
        });
        
        setAggregatedData(data);
      } catch (err) {
        console.error("Failed to fetch aggregated visibility data:", err);
        setError("Failed to load visibility data");
      } finally {
        setLoading(false);
      }
    };

    fetchAggregatedData();
  }, [reports, selectedModels, token]);

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
      };
    }

    // Transform chart data to match existing format
    const chartData = aggregatedData.chartData.map((point: any) => {
      const transformedPoint: any = {
        date: new Date(point.date).toLocaleDateString(),
        Brand: point.brand,
      };
      
      // Add competitor data
      Object.entries(point.competitors || {}).forEach(([name, score]) => {
        transformedPoint[name] = score;
      });
      
      return transformedPoint;
    });

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
  };
}