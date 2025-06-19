import { useState, useEffect, useMemo } from "react";
import { getReportAlignment } from "@/lib/api/report";
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
  const [alignmentData, setAlignmentData] = useState<Record<string, AlignmentResults>>({});

  // Fetch alignment data for all selected reports
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
          const newAlignmentData: Record<string, AlignmentResults> = {};

          selectedReports.forEach((report, reportIndex) => {
            // Generate detailed results for each model
            const detailedResults: DetailedAlignmentResult[] = [];
            models.forEach((model, modelIndex) => {
              detailedResults.push({
                model: model,
                promptIndex: 0,
                originalPrompt: "How well does this brand align with its key attributes?",
                llmResponse: "This is a sample response demonstrating alignment analysis...",
                attributeScores: attributes.map(attr => ({
                  attribute: attr,
                  score: 0.4 + (Math.random() * 0.3) + (modelIndex * 0.05) + (reportIndex * 0.02),
                  evaluation: `The brand shows moderate alignment with ${attr}`
                })),
                citations: [],
                toolUsage: []
              });
            });

            // Calculate average scores
            const averageAttributeScores: Record<string, number> = {};
            attributes.forEach(attr => {
              const scores = detailedResults.map(r => 
                r.attributeScores.find(a => a.attribute === attr)?.score || 0
              );
              averageAttributeScores[attr] = scores.reduce((a, b) => a + b, 0) / scores.length;
            });

            // Calculate overall alignment score
            const overallScore = Object.values(averageAttributeScores).reduce((a, b) => a + b, 0) / 
                                Object.values(averageAttributeScores).length;

            newAlignmentData[report.id] = {
              summary: {
                overallAlignmentScore: Math.round(overallScore * 100),
                averageAttributeScores,
                attributeAlignmentSummary: attributes.map(attr => ({
                  name: attr,
                  mentionRate: "100%",
                  alignment: averageAttributeScores[attr] > 0.6 ? "✅ High" : 
                             averageAttributeScores[attr] > 0.4 ? "⚠️ Medium" : "❌ Low"
                }))
              },
              detailedResults
            };
          });

          setAlignmentData(newAlignmentData);
        } else {
          const promises = selectedReports.map(report =>
            getReportAlignment(report.id, token)
              .then(data => ({ reportId: report.id, data, generatedAt: report.generatedAt }))
              .catch(err => {
                console.error(`Failed to fetch alignment for report ${report.id}:`, err);
                return null;
              })
          );

          const results = await Promise.all(promises);
          const newAlignmentData: Record<string, AlignmentResults> = {};

          results.forEach(result => {
            if (result && result.data) {
              // Handle different response formats
              if (result.data.summary && result.data.detailedResults) {
                newAlignmentData[result.reportId] = result.data;
              } else if (result.data.overallAlignmentScore !== undefined && 
                        result.data.averageAttributeScores && 
                        result.data.detailedResults) {
                // New format from brand-reports endpoint - wrap in summary
                newAlignmentData[result.reportId] = {
                  summary: {
                    overallAlignmentScore: result.data.overallAlignmentScore,
                    averageAttributeScores: result.data.averageAttributeScores,
                    attributeAlignmentSummary: result.data.attributeAlignmentSummary || []
                  },
                  detailedResults: result.data.detailedResults
                };
              }
            }
          });

          setAlignmentData(newAlignmentData);
        }
      } catch (err) {
        console.error("Failed to fetch alignment data:", err);
        setError("Failed to load alignment data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedReports, token, isFreePlan]);

  // Calculate aggregated metrics
  const metrics = useMemo(() => {
    const reportIds = Object.keys(alignmentData);
    if (reportIds.length === 0) {
      return {
        averageScore: 0,
        scoreVariation: 0,
        chartData: [],
        aggregatedAttributeScores: {},
        availableModels: [],
        detailedResults: []
      };
    }

    // Extract available models from the data
    const modelSet = new Set<string>();
    reportIds.forEach(reportId => {
      const data = alignmentData[reportId];
      if (data?.detailedResults) {
        data.detailedResults.forEach(result => {
          if (result.model) {
            modelSet.add(result.model);
          }
        });
      }
    });
    const availableModels = Array.from(modelSet).sort();

    // Filter results by selected models
    const filteredData: Record<string, AlignmentResults> = {};
    reportIds.forEach(reportId => {
      const data = alignmentData[reportId];
      if (data?.detailedResults) {
        const filteredResults = data.detailedResults.filter(result =>
          selectedModels.includes(result.model)
        );
        
        if (filteredResults.length > 0) {
          filteredData[reportId] = {
            ...data,
            detailedResults: filteredResults
          };
        }
      }
    });

    const filteredReportIds = Object.keys(filteredData);
    if (filteredReportIds.length === 0) {
      return {
        averageScore: 0,
        scoreVariation: 0,
        chartData: [],
        aggregatedAttributeScores: {},
        availableModels,
        detailedResults: []
      };
    }

    // Calculate average alignment score across all reports
    let totalScore = 0;
    let scoreCount = 0;
    const chartData: Array<{ date: string; score: number; reportId: string }> = [];

    filteredReportIds.forEach(reportId => {
      const data = filteredData[reportId];
      const report = selectedReports.find(r => r.id === reportId);
      
      if (data?.summary?.overallAlignmentScore !== undefined && report) {
        totalScore += data.summary.overallAlignmentScore;
        scoreCount++;
        
        chartData.push({
          date: new Date(report.generatedAt).toISOString(),
          score: data.summary.overallAlignmentScore,
          reportId: reportId
        });
      }
    });

    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    // Sort chart data by date
    chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate score variation (compare with previous period)
    let scoreVariation = 0;
    if (chartData.length >= 2) {
      // Get the midpoint of the data
      const midPoint = Math.floor(chartData.length / 2);
      
      // Calculate average for first half (previous period)
      const firstHalfScores = chartData.slice(0, midPoint).map(d => d.score);
      const firstHalfAvg = firstHalfScores.reduce((a, b) => a + b, 0) / firstHalfScores.length;
      
      // Calculate average for second half (current period)
      const secondHalfScores = chartData.slice(midPoint).map(d => d.score);
      const secondHalfAvg = secondHalfScores.reduce((a, b) => a + b, 0) / secondHalfScores.length;
      
      // Calculate percentage change
      if (firstHalfAvg > 0) {
        scoreVariation = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
      }
    }

    // Calculate aggregated attribute scores
    const attributeScores: Record<string, { total: number; count: number }> = {};
    
    filteredReportIds.forEach(reportId => {
      const data = filteredData[reportId];
      if (data?.summary?.averageAttributeScores) {
        Object.entries(data.summary.averageAttributeScores).forEach(([attr, score]) => {
          if (!attributeScores[attr]) {
            attributeScores[attr] = { total: 0, count: 0 };
          }
          attributeScores[attr].total += score;
          attributeScores[attr].count += 1;
        });
      }
    });

    const aggregatedAttributeScores: Record<string, number> = {};
    Object.entries(attributeScores).forEach(([attr, data]) => {
      aggregatedAttributeScores[attr] = data.count > 0 ? data.total / data.count : 0;
    });

    // Collect all detailed results
    const detailedResults = filteredReportIds.map(reportId => filteredData[reportId]);

    return {
      averageScore,
      scoreVariation,
      chartData,
      aggregatedAttributeScores,
      availableModels,
      detailedResults
    };
  }, [alignmentData, selectedModels, selectedReports]);

  return {
    loading,
    error,
    ...metrics
  };
}