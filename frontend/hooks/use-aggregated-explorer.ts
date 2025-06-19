"use client";

import { useState, useEffect } from "react";
import { getAggregatedExplorer } from "@/lib/api/report";
import type { ReportResponse } from "@/types/reports";

interface ExplorerItem {
  name: string;
  count: number;
  percentage?: number;
}

interface UseAggregatedExplorerReturn {
  loading: boolean;
  error: string | null;
  topMentions: ExplorerItem[];
  topKeywords: ExplorerItem[];
  topSources: ExplorerItem[];
  summary: {
    totalPrompts: number;
    promptsWithWebAccess: number;
    webAccessPercentage: number;
    totalCitations: number;
    uniqueSources: number;
  };
}

export function useAggregatedExplorer(
  projectId: string | null,
  reports: ReportResponse[],
  token: string | null
): UseAggregatedExplorerReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UseAggregatedExplorerReturn>({
    loading: false,
    error: null,
    topMentions: [],
    topKeywords: [],
    topSources: [],
    summary: {
      totalPrompts: 0,
      promptsWithWebAccess: 0,
      webAccessPercentage: 0,
      totalCitations: 0,
      uniqueSources: 0,
    },
  });

  useEffect(() => {
    const fetchAggregatedExplorer = async () => {
      if (!token || !projectId || reports.length === 0) {
        setData({
          loading: false,
          error: null,
          topMentions: [],
          topKeywords: [],
          topSources: [],
          summary: {
            totalPrompts: 0,
            promptsWithWebAccess: 0,
            webAccessPercentage: 0,
            totalCitations: 0,
            uniqueSources: 0,
          },
        });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get date range from reports
        const sortedReports = [...reports].sort((a, b) => 
          new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
        );
        const startDate = sortedReports[0].generatedAt.split('T')[0];
        const endDate = sortedReports[sortedReports.length - 1].generatedAt.split('T')[0];

        const response = await getAggregatedExplorer(projectId, token, {
          startDate,
          endDate,
        });

        // Transform the response to match hook interface
        const topMentions = response.topMentions.map((item: any) => ({
          name: item.name,
          count: item.count,
          percentage: item.percentage,
        }));

        const topKeywords = response.topKeywords.map((item: any) => ({
          name: item.name,
          count: item.count,
          percentage: item.percentage,
        }));

        const topSources = response.topSources.map((item: any) => ({
          name: item.name,
          count: item.count,
          percentage: item.percentage,
        }));

        setData({
          loading: false,
          error: null,
          topMentions,
          topKeywords,
          topSources,
          summary: response.summary,
        });
      } catch (err) {
        console.error("Failed to fetch aggregated explorer data:", err);
        setError("Failed to load explorer data");
        setData({
          loading: false,
          error: "Failed to load explorer data",
          topMentions: [],
          topKeywords: [],
          topSources: [],
          summary: {
            totalPrompts: 0,
            promptsWithWebAccess: 0,
            webAccessPercentage: 0,
            totalCitations: 0,
            uniqueSources: 0,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAggregatedExplorer();
  }, [projectId, reports, token]);

  return {
    loading,
    error,
    topMentions: data.topMentions,
    topKeywords: data.topKeywords,
    topSources: data.topSources,
    summary: data.summary,
  };
}