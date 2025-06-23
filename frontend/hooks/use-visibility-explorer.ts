"use client";

import { useState, useEffect, useCallback } from "react";
import { getReportExplorer } from "@/lib/auth-api";
import type { ReportResponse } from "@/types/reports";
import type { ExplorerData } from "@/types/brand-reports";

interface UseVisibilityExplorerReturn {
  loading: boolean;
  error: string | null;
  topMentions: Array<{ mention: string; count: number }>;
  topKeywords: Array<{ keyword: string; count: number }>;
  topSources: Array<{ domain: string; count: number }>;
}

export function useVisibilityExplorer(
  reports: ReportResponse[],
  token: string | null
): UseVisibilityExplorerReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explorerDataMap, setExplorerDataMap] = useState<Record<string, ExplorerData>>({});

  // Fetch explorer data for all reports
  useEffect(() => {
    const fetchAllExplorerData = async () => {
      if (!token || reports.length === 0) {
        setExplorerDataMap({});
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const promises = reports.map(report =>
          getReportExplorer(report.id, token).then(data => ({
            reportId: report.id,
            data,
          }))
        );

        const results = await Promise.all(promises);
        const dataMap: Record<string, ExplorerData> = {};
        
        results.forEach(result => {
          dataMap[result.reportId] = result.data;
        });

        setExplorerDataMap(dataMap);
      } catch (err) {
        console.error("Failed to fetch explorer data:", err);
        setError("Failed to load explorer data");
      } finally {
        setLoading(false);
      }
    };

    fetchAllExplorerData();
  }, [reports, token]);

  // Aggregate data from all reports
  const aggregateData = useCallback((): UseVisibilityExplorerReturn => {
    if (Object.keys(explorerDataMap).length === 0) {
      return {
        loading: false,
        error: null,
        topMentions: [],
        topKeywords: [],
        topSources: [],
      };
    }

    // Aggregate mentions
    const mentionCounts: Record<string, number> = {};
    const keywordCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};

    Object.values(explorerDataMap).forEach(explorerData => {
      // Filter for visibility-related data only
      // Check if we have webSearchResults (new format)
      if (explorerData.webSearchResults) {
        explorerData.webSearchResults.forEach(searchResult => {
          searchResult.citations.forEach(citation => {
            // Only include visibility prompt types
            if (citation.promptType?.toLowerCase().includes('visibility') || 
                citation.promptType?.toLowerCase().includes('spontaneous')) {
              // Count sources
              const domain = new URL(citation.link || '').hostname || citation.website;
              sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;

              // Extract keywords from search query (not mentions)
              const words = searchResult.query.toLowerCase().split(/\s+/);
              words.forEach(word => {
                if (word.length > 3) { // Only count words longer than 3 characters
                  keywordCounts[word] = (keywordCounts[word] || 0) + 1;
                }
              });
            }
          });
        });
      }

      // Process topMentions if available
      if (explorerData.topMentions) {
        explorerData.topMentions.forEach(item => {
          mentionCounts[item.mention] = (mentionCounts[item.mention] || 0) + item.count;
        });
      }

      // Process topKeywords if available
      if (explorerData.topKeywords) {
        explorerData.topKeywords.forEach(item => {
          if (item.keyword.toLowerCase() !== 'unknown') {
            keywordCounts[item.keyword] = (keywordCounts[item.keyword] || 0) + item.count;
          }
        });
      }

      // Process topSources if available
      if (explorerData.topSources) {
        explorerData.topSources.forEach(item => {
          sourceCounts[item.domain] = (sourceCounts[item.domain] || 0) + item.count;
        });
      }
    });

    // Convert to sorted arrays
    const topMentions = Object.entries(mentionCounts)
      .map(([mention, count]) => ({ mention, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topKeywords = Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topSources = Object.entries(sourceCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      loading: false,
      error: null,
      topMentions,
      topKeywords,
      topSources,
    };
  }, [explorerDataMap]);

  const aggregatedData = aggregateData();
  
  return {
    loading,
    error,
    topMentions: aggregatedData.topMentions,
    topKeywords: aggregatedData.topKeywords,
    topSources: aggregatedData.topSources,
  };
}