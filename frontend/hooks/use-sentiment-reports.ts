"use client";

import { useMemo, useState, useEffect } from "react";
import type { ReportResponse } from "@/types/reports";
import { getReportSentiment } from "@/lib/api/report";
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
  chartData: Array<{
    date: string;
    score: number;
    positive: number;
    neutral: number;
    negative: number;
  }>;
  aggregatedHeatmap: SentimentData['heatmapData'];
  availableModels: string[];
}

export function useSentimentReports(
  reports: ReportResponse[],
  selectedModels: string[],
  token: string | null
): UseSentimentReportsReturn {
  const [sentimentDataMap, setSentimentDataMap] = useState<Map<string, SentimentData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sentiment data for all reports
  useEffect(() => {
    if (!reports.length || !token) {
      setSentimentDataMap(new Map());
      return;
    }

    const fetchAllSentimentData = async () => {
      setLoading(true);
      setError(null);

      try {
        const sentimentPromises = reports.map(report => 
          getReportSentiment(report.id, token)
            .then(data => ({ reportId: report.id, data }))
            .catch(err => {
              console.error(`Failed to fetch sentiment for report ${report.id}:`, err);
              return null;
            })
        );

        const results = await Promise.all(sentimentPromises);
        const newMap = new Map<string, SentimentData>();

        results.forEach((result) => {
          if (result) {
            newMap.set(result.reportId, result.data);
          }
        });

        setSentimentDataMap(newMap);
      } catch (err) {
        console.error("Failed to fetch sentiment data:", err);
        setError("Failed to load sentiment data");
      } finally {
        setLoading(false);
      }
    };

    fetchAllSentimentData();
  }, [reports, token]);

  return useMemo(() => {
    // Extract all unique models from the fetched data
    const uniqueModels = new Set<string>();
    sentimentDataMap.forEach(sentimentData => {
      sentimentData.heatmapData.forEach(question => {
        question.results.forEach(result => {
          uniqueModels.add(result.model);
        });
      });
    });
    const availableModels = Array.from(uniqueModels).sort();

    if (!reports.length || loading) {
      return {
        loading,
        error,
        averageScore: 0,
        scoreVariation: null,
        distribution: { positive: 0, neutral: 0, negative: 0 },
        distributionVariations: { positive: null, neutral: null, negative: null },
        chartData: [],
        aggregatedHeatmap: [],
        availableModels,
      };
    }

    try {
      // Sort reports by date
      const sortedReports = [...reports].sort(
        (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
      );

      // Calculate metrics from reports
      let totalScore = 0;
      let totalPositive = 0;
      let totalNeutral = 0;
      let totalNegative = 0;
      let validReports = 0;
      const chartData: UseSentimentReportsReturn['chartData'] = [];
      const heatmapByQuestion = new Map<string, any[]>();

      sortedReports.forEach((report) => {
        const sentimentData = sentimentDataMap.get(report.id);
        if (!sentimentData) return;

        // Filter heatmap data by selected models (if any selected)
        const filteredHeatmap = selectedModels.length > 0
          ? sentimentData.heatmapData.map(question => ({
              ...question,
              results: question.results.filter(r => selectedModels.includes(r.model))
            })).filter(q => q.results.length > 0)
          : sentimentData.heatmapData;

        if (filteredHeatmap.length > 0) {
          validReports++;
          
          // Add to total score
          totalScore += sentimentData.overallScore;
          
          // Add to distribution totals
          totalPositive += sentimentData.distribution.positive;
          totalNeutral += sentimentData.distribution.neutral;
          totalNegative += sentimentData.distribution.negative;
          
          // Add to chart data
          chartData.push({
            date: new Date(report.generatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            score: sentimentData.overallScore,
            positive: sentimentData.distribution.positive,
            neutral: sentimentData.distribution.neutral,
            negative: sentimentData.distribution.negative,
          });
          
          // Aggregate heatmap data
          filteredHeatmap.forEach((questionData) => {
            const questionKey = questionData.question;
            if (!heatmapByQuestion.has(questionKey)) {
              heatmapByQuestion.set(questionKey, []);
            }
            const existingResults = heatmapByQuestion.get(questionKey)!;
            
            questionData.results.forEach((result) => {
              existingResults.push(result);
            });
          });
        }
      });

      // Calculate averages
      const averageScore = validReports > 0 ? Math.round(totalScore / validReports) : 0;
      
      // Calculate distribution percentages
      const totalSentiments = totalPositive + totalNeutral + totalNegative;
      const avgPositive = totalSentiments > 0 ? Math.round((totalPositive / totalSentiments) * 100) : 0;
      const avgNeutral = totalSentiments > 0 ? Math.round((totalNeutral / totalSentiments) * 100) : 0;
      const avgNegative = totalSentiments > 0 ? Math.round((totalNegative / totalSentiments) * 100) : 0;

      // Calculate period-over-period variations
      let scoreVariation: number | null = null;
      let positiveVariation: number | null = null;
      let neutralVariation: number | null = null;
      let negativeVariation: number | null = null;
      
      if (chartData.length >= 2) {
        const midPoint = Math.floor(chartData.length / 2);
        
        // Overall score variation
        const firstHalfAvg = chartData
          .slice(0, midPoint)
          .reduce((sum, data) => sum + data.score, 0) / midPoint;
          
        const secondHalfAvg = chartData
          .slice(midPoint)
          .reduce((sum, data) => sum + data.score, 0) / (chartData.length - midPoint);
          
        scoreVariation = Math.round(secondHalfAvg - firstHalfAvg);
        
        // Positive variation
        const firstHalfPositive = chartData
          .slice(0, midPoint)
          .reduce((sum, data) => sum + data.positive, 0) / midPoint;
          
        const secondHalfPositive = chartData
          .slice(midPoint)
          .reduce((sum, data) => sum + data.positive, 0) / (chartData.length - midPoint);
          
        if (firstHalfPositive > 0) {
          positiveVariation = Math.round(((secondHalfPositive - firstHalfPositive) / firstHalfPositive) * 100);
        }
        
        // Neutral variation
        const firstHalfNeutral = chartData
          .slice(0, midPoint)
          .reduce((sum, data) => sum + data.neutral, 0) / midPoint;
          
        const secondHalfNeutral = chartData
          .slice(midPoint)
          .reduce((sum, data) => sum + data.neutral, 0) / (chartData.length - midPoint);
          
        if (firstHalfNeutral > 0) {
          neutralVariation = Math.round(((secondHalfNeutral - firstHalfNeutral) / firstHalfNeutral) * 100);
        }
        
        // Negative variation
        const firstHalfNegative = chartData
          .slice(0, midPoint)
          .reduce((sum, data) => sum + data.negative, 0) / midPoint;
          
        const secondHalfNegative = chartData
          .slice(midPoint)
          .reduce((sum, data) => sum + data.negative, 0) / (chartData.length - midPoint);
          
        if (firstHalfNegative > 0) {
          negativeVariation = Math.round(((secondHalfNegative - firstHalfNegative) / firstHalfNegative) * 100);
        }
      }

      // Build aggregated heatmap
      const aggregatedHeatmap: SentimentData['heatmapData'] = [];
      heatmapByQuestion.forEach((results, question) => {
        // Group by model and calculate most common sentiment
        const modelResults = new Map<string, any[]>();
        results.forEach(result => {
          if (!modelResults.has(result.model)) {
            modelResults.set(result.model, []);
          }
          modelResults.get(result.model)!.push(result);
        });
        
        const aggregatedResults: any[] = [];
        modelResults.forEach((modelData, model) => {
          // Count sentiments
          const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
          modelData.forEach(d => {
            if (d.sentiment in sentimentCounts) {
              sentimentCounts[d.sentiment as keyof typeof sentimentCounts]++;
            }
          });
          
          // Find dominant sentiment
          let dominantSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
          let maxCount = 0;
          Object.entries(sentimentCounts).forEach(([sentiment, count]) => {
            if (count > maxCount) {
              maxCount = count;
              dominantSentiment = sentiment as typeof dominantSentiment;
            }
          });
          
          // Map sentiment to status
          const status = dominantSentiment === 'positive' ? 'green' : 
                        dominantSentiment === 'negative' ? 'red' : 'yellow';
          
          aggregatedResults.push({
            model,
            sentiment: dominantSentiment,
            status,
            llmResponse: modelData[modelData.length - 1]?.llmResponse, // Use latest response
          });
        });
        
        if (aggregatedResults.length > 0) {
          aggregatedHeatmap.push({
            question,
            results: aggregatedResults,
          });
        }
      });

      return {
        loading: false,
        error: null,
        averageScore,
        scoreVariation,
        distribution: {
          positive: avgPositive,
          neutral: avgNeutral,
          negative: avgNegative,
        },
        distributionVariations: {
          positive: positiveVariation,
          neutral: neutralVariation,
          negative: negativeVariation,
        },
        chartData,
        aggregatedHeatmap,
        availableModels,
      };
    } catch (err) {
      console.error("Error processing sentiment reports:", err);
      return {
        loading: false,
        error: "Failed to process sentiment data",
        averageScore: 0,
        scoreVariation: null,
        distribution: { positive: 0, neutral: 0, negative: 0 },
        distributionVariations: { positive: null, neutral: null, negative: null },
        chartData: [],
        aggregatedHeatmap: [],
        availableModels,
      };
    }
  }, [reports, selectedModels, sentimentDataMap, loading, error]);
}