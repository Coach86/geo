"use client";

import { useState, useEffect, useCallback } from "react";
import { getReportVisibility } from "@/lib/api/report";
import type { ReportResponse } from "@/types/reports";

interface VisibilityData {
  overallMentionRate: number;
  promptsTested: number;
  modelVisibility: {
    model: string;
    mentionRate: number;
  }[];
  arenaMetrics: {
    name: string;
    size?: string;
    global?: string;
    modelsMentionsRate?: {
      model: string;
      mentionsRate: number;
    }[];
  }[];
}

interface CompetitorData {
  name: string;
  averageScore: number;
  variation: number;
  modelScores: Record<string, number>;
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
  const [visibilityDataMap, setVisibilityDataMap] = useState<Record<string, VisibilityData>>({});

  // Fetch visibility data for all reports
  useEffect(() => {
    const fetchAllVisibilityData = async () => {
      if (!token || reports.length === 0) {
        setVisibilityDataMap({});
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const promises = reports.map(report =>
          getReportVisibility(report.id, token).then(data => ({
            reportId: report.id,
            date: report.generatedAt,
            data,
          }))
        );

        const results = await Promise.all(promises);
        const dataMap: Record<string, VisibilityData> = {};
        
        results.forEach(result => {
          dataMap[result.reportId] = result.data;
        });
        setVisibilityDataMap(dataMap);
      } catch (err) {
        console.error("Failed to fetch visibility data:", err);
        setError("Failed to load visibility data");
      } finally {
        setLoading(false);
      }
    };

    fetchAllVisibilityData();
  }, [reports, token]);

  // Calculate metrics
  const calculateMetrics = useCallback((): UseVisibilityReportsReturn => {
    // Extract all unique models from the fetched data
    const uniqueModels = new Set<string>();
    Object.values(visibilityDataMap).forEach(visData => {
      if (visData.modelVisibility) {
        visData.modelVisibility.forEach(mv => {
          uniqueModels.add(mv.model);
        });
      }
    });
    const availableModels = Array.from(uniqueModels).sort();

    if (reports.length === 0 || Object.keys(visibilityDataMap).length === 0) {
      return {
        loading: false,
        error: null,
        averageScore: 0,
        scoreVariation: 0,
        competitors: [],
        chartData: [],
        modelBreakdown: [],
        availableModels,
      };
    }

    // Sort reports by date for chronological processing
    const sortedReports = [...reports].sort(
      (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
    );

    // Calculate average brand score
    let totalScore = 0;
    let scoreCount = 0;
    const competitorMap: Record<string, { scores: number[]; dates: string[] }> = {};
    const chartData: Array<{ date: string; [key: string]: string | number }> = [];

    sortedReports.forEach(report => {
      const visData = visibilityDataMap[report.id];
      if (!visData) {
        return;
      }

      // If we have overallMentionRate but no modelVisibility, use it directly
      if (visData.overallMentionRate !== undefined && (!visData.modelVisibility || visData.modelVisibility.length === 0)) {
        totalScore += visData.overallMentionRate;
        scoreCount++;
        
        const dataPoint: any = {
          date: new Date(report.generatedAt).toLocaleDateString(),
          Brand: visData.overallMentionRate,
        };
        chartData.push(dataPoint);
        return;
      }

      // Filter by selected models
      const filteredModelVisibility = selectedModels.length > 0
        ? (visData.modelVisibility || []).filter(mv => selectedModels.includes(mv.model))
        : (visData.modelVisibility || []);

      if (filteredModelVisibility.length > 0) {
        const avgForReport = filteredModelVisibility.reduce((sum, mv) => sum + mv.mentionRate, 0) / filteredModelVisibility.length;
        totalScore += avgForReport;
        scoreCount++;

        // Prepare chart data point
        const dataPoint: any = {
          date: new Date(report.generatedAt).toLocaleDateString(),
          Brand: Math.round(avgForReport),
        };

        // Process competitors from arenaMetrics
        if (visData.arenaMetrics && Array.isArray(visData.arenaMetrics)) {
          visData.arenaMetrics.forEach(competitor => {
            // Calculate average mention rate for this competitor across selected models
            if (competitor.modelsMentionsRate) {
              const filteredCompetitorRates = selectedModels.length > 0
                ? competitor.modelsMentionsRate.filter(mmr => selectedModels.includes(mmr.model))
                : competitor.modelsMentionsRate;
              
              if (filteredCompetitorRates.length > 0) {
                const avgCompetitorRate = filteredCompetitorRates.reduce((sum, mmr) => sum + mmr.mentionsRate, 0) / filteredCompetitorRates.length;
                
                if (!competitorMap[competitor.name]) {
                  competitorMap[competitor.name] = { scores: [], dates: [] };
                }
                competitorMap[competitor.name].scores.push(avgCompetitorRate);
                competitorMap[competitor.name].dates.push(report.generatedAt);
                dataPoint[competitor.name] = Math.round(avgCompetitorRate);
              }
            }
          });
        }

        chartData.push(dataPoint);
      }
    });

    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    // Calculate variation (comparing last period vs previous period)
    let scoreVariation = 0;
    if (sortedReports.length >= 2) {
      const midPoint = Math.floor(sortedReports.length / 2);
      const firstHalf = sortedReports.slice(0, midPoint);
      const secondHalf = sortedReports.slice(midPoint);

      const firstHalfAvg = calculatePeriodAverage(firstHalf, visibilityDataMap, selectedModels);
      const secondHalfAvg = calculatePeriodAverage(secondHalf, visibilityDataMap, selectedModels);

      if (firstHalfAvg > 0) {
        scoreVariation = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
      }
    }

    // Process competitors
    const competitors: CompetitorData[] = Object.entries(competitorMap).map(([name, data]) => {
      const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      
      // Calculate variation for competitor
      let variation = 0;
      if (data.scores.length >= 2) {
        const midPoint = Math.floor(data.scores.length / 2);
        const firstHalfAvg = data.scores.slice(0, midPoint).reduce((sum, s) => sum + s, 0) / midPoint;
        const secondHalfAvg = data.scores.slice(midPoint).reduce((sum, s) => sum + s, 0) / (data.scores.length - midPoint);
        
        if (firstHalfAvg > 0) {
          variation = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
        }
      }

      return {
        name,
        averageScore: Math.round(avgScore),
        variation,
        modelScores: {}, // TODO: Calculate per model if needed
      };
    });

    // Calculate model breakdown
    const modelBreakdown = selectedModels.map(model => {
      let brandTotal = 0;
      let brandCount = 0;
      const competitorScores: Record<string, number> = {};

      sortedReports.forEach(report => {
        const visData = visibilityDataMap[report.id];
        if (!visData) return;

        const modelData = visData.modelVisibility.find(mv =>
          mv.model.includes(model) || model.includes(mv.model)
        );

        if (modelData) {
          brandTotal += modelData.mentionRate;
          brandCount++;
        }

        // Calculate competitor scores for this model
        visData.arenaMetrics?.forEach(competitor => {
          const competitorModelData = competitor.modelsMentionsRate?.find(mmr =>
            mmr.model.includes(model) || model.includes(mmr.model)
          );
          
          if (competitorModelData) {
            if (!competitorScores[competitor.name]) {
              competitorScores[competitor.name] = 0;
            }
            competitorScores[competitor.name] += competitorModelData.mentionsRate;
          }
        });
      });

      // Average competitor scores
      Object.keys(competitorScores).forEach(name => {
        competitorScores[name] = Math.round(competitorScores[name] / brandCount);
      });

      return {
        model,
        brandScore: brandCount > 0 ? Math.round(brandTotal / brandCount) : 0,
        competitorScores,
      };
    });

    return {
      loading: false,
      error: null,
      averageScore,
      scoreVariation,
      competitors,
      chartData,
      modelBreakdown,
      availableModels,
    };
  }, [reports, visibilityDataMap, selectedModels]);

  const metrics = calculateMetrics();
  
  return {
    loading,
    error,
    averageScore: metrics.averageScore,
    scoreVariation: metrics.scoreVariation,
    competitors: metrics.competitors,
    chartData: metrics.chartData,
    modelBreakdown: metrics.modelBreakdown,
    availableModels: metrics.availableModels,
  };
}

function calculatePeriodAverage(
  reports: ReportResponse[],
  visibilityDataMap: Record<string, VisibilityData>,
  selectedModels: string[]
): number {
  let total = 0;
  let count = 0;

  reports.forEach(report => {
    const visData = visibilityDataMap[report.id];
    if (!visData) return;

    const filteredModelVisibility = visData.modelVisibility.filter(mv =>
      selectedModels.some(model => mv.model.includes(model) || model.includes(mv.model))
    );

    if (filteredModelVisibility.length > 0) {
      const avg = filteredModelVisibility.reduce((sum, mv) => sum + mv.mentionRate, 0) / filteredModelVisibility.length;
      total += avg;
      count++;
    }
  });

  return count > 0 ? total / count : 0;
}