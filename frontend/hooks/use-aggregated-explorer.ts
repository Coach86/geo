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
  domainSourceAnalysis?: {
    brandDomainPercentage: number;
    otherSourcesPercentage: number;
    brandDomainCount: number;
    otherSourcesCount: number;
  };
}

export function useAggregatedExplorer(
  projectId: string | null,
  token: string | null,
  dateRange?: { startDate: Date; endDate: Date },
  isLatest: boolean = false
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
    domainSourceAnalysis: undefined,
  });

  useEffect(() => {
    const fetchAggregatedExplorer = async () => {
      if (!token || !projectId || (!dateRange && !isLatest)) {
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
          domainSourceAnalysis: undefined,
        });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const queryParams: any = {};
        
        if (isLatest) {
          queryParams.latestOnly = true;
        } else if (dateRange) {
          queryParams.startDate = dateRange.startDate.toISOString();
          queryParams.endDate = dateRange.endDate.toISOString();
        }

        const response = await getAggregatedExplorer(projectId, token, queryParams);

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
          domainSourceAnalysis: response.domainSourceAnalysis,
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
          domainSourceAnalysis: undefined,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAggregatedExplorer();
  }, [projectId, dateRange, token, isLatest]);

  return {
    loading,
    error,
    topKeywords: data.topKeywords,
    topSources: data.topSources,
    summary: data.summary,
    citations: data.citations,
    webSearchResults: data.webSearchResults,
    domainSourceAnalysis: data.domainSourceAnalysis,
  };
}