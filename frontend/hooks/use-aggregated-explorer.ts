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
  topKeywords: ExplorerItem[];
  topSources: ExplorerItem[];
  summary: {
    totalPrompts: number;
    promptsWithWebAccess: number;
    webAccessPercentage: number;
    totalCitations: number;
    uniqueSources: number;
  };
  citations?: any[];
  webSearchResults?: any[];
}

export function useAggregatedExplorer(
  projectId: string | null,
  token: string | null,
  dateRange?: { startDate: Date; endDate: Date }
): UseAggregatedExplorerReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UseAggregatedExplorerReturn>({
    loading: false,
    error: null,
    topKeywords: [],
    topSources: [],
    summary: {
      totalPrompts: 0,
      promptsWithWebAccess: 0,
      webAccessPercentage: 0,
      totalCitations: 0,
      uniqueSources: 0,
    },
    citations: [],
    webSearchResults: [],
  });

  useEffect(() => {
    const fetchAggregatedExplorer = async () => {
      if (!token || !projectId || !dateRange) {
        setData({
          loading: false,
          error: null,
          topKeywords: [],
          topSources: [],
          summary: {
            totalPrompts: 0,
            promptsWithWebAccess: 0,
            webAccessPercentage: 0,
            totalCitations: 0,
            uniqueSources: 0,
          },
          citations: [],
          webSearchResults: [],
        });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use the provided date range
        const startDate = dateRange.startDate.toISOString().split('T')[0];
        const endDate = dateRange.endDate.toISOString().split('T')[0];

        const response = await getAggregatedExplorer(projectId, token, {
          startDate,
          endDate,
        });

        // Transform the response to match hook interface
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
          topKeywords,
          topSources,
          summary: response.summary,
          citations: response.citations || [],
          webSearchResults: response.webSearchResults || [],
        });
      } catch (err) {
        console.error("Failed to fetch aggregated explorer data:", err);
        setError("Failed to load explorer data");
        setData({
          loading: false,
          error: "Failed to load explorer data",
          topKeywords: [],
          topSources: [],
          summary: {
            totalPrompts: 0,
            promptsWithWebAccess: 0,
            webAccessPercentage: 0,
            totalCitations: 0,
            uniqueSources: 0,
          },
          citations: [],
          webSearchResults: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAggregatedExplorer();
  }, [projectId, dateRange, token]);

  return {
    loading,
    error,
    topKeywords: data.topKeywords,
    topSources: data.topSources,
    summary: data.summary,
    citations: data.citations,
    webSearchResults: data.webSearchResults,
  };
}