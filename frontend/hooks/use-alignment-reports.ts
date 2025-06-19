import { useState, useEffect, useMemo } from "react";
import { getAggregatedAlignment } from "@/lib/api/report";
import type { ReportResponse } from "@/types/reports";
import type { AlignmentResults, DetailedAlignmentResult } from "@/types/alignment";
import { useFeatureGate } from "@/hooks/use-feature-access";

interface UseAlignmentReportsReturn {
  loading: boolean;
  error: string | null;
  averageScore: number;
  scoreVariation: number;
  chartData: Array<{
    date: string;
    score: number;
    reportId: string;
  }>;
  aggregatedAttributeScores: Record<string, number>;
  availableModels: string[];
  detailedResults: AlignmentResults[];
}

export function useAlignmentReports(
  selectedReports: ReportResponse[],
  selectedModels: string[],
  token: string | null
): UseAlignmentReportsReturn {
  const { isFreePlan } = useFeatureGate("alignment");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aggregatedData, setAggregatedData] = useState<any>(null);

  // Fetch aggregated alignment data
  useEffect(() => {
    if (!token || selectedReports.length === 0) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
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
          
          // Create mock aggregated data
          const mockAggregatedData = {
            averageScore: 65 + Math.random() * 20,
            scoreVariation: Math.random() > 0.5 ? Math.floor(Math.random() * 15) : -Math.floor(Math.random() * 10),
            availableModels: models,
            chartData: selectedReports.map((report, index) => ({
              date: new Date(report.generatedAt).toISOString().split('T')[0],
              score: 60 + Math.random() * 25 + index * 2,
              reportId: report.id
            })),
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
          // Get project ID from the first report
          const projectId = selectedReports[0].projectId;
          
          // Sort reports to get date range
          const sortedReports = [...selectedReports].sort(
            (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
          );
          
          const startDate = sortedReports[0].generatedAt;
          const endDate = sortedReports[sortedReports.length - 1].generatedAt;

          const data = await getAggregatedAlignment(projectId, token, {
            startDate,
            endDate,
            models: selectedModels, // Send the array as-is (empty array means all models)
            includeVariation: true,
          });
          
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
  }, [selectedReports, selectedModels, token, isFreePlan]);

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
        detailedResults: []
      };
    }

    return {
      loading: false,
      error: null,
      averageScore: Math.round(aggregatedData.averageScore),
      scoreVariation: aggregatedData.scoreVariation,
      chartData: aggregatedData.chartData,
      aggregatedAttributeScores: aggregatedData.aggregatedAttributeScores || {},
      availableModels: aggregatedData.availableModels || [],
      detailedResults: [] // No detailed results from aggregated endpoint
    };
  }, [aggregatedData]);

  return {
    loading,
    error,
    ...result
  };
}