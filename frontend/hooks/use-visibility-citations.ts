"use client";

import { useState, useEffect, useMemo } from "react";
import { getAggregatedVisibility } from "@/lib/api/report";
import type { VisibilityCitation } from "@/components/visibility/VisibilityCitationsTable";

interface UseVisibilityCitationsReturn {
  loading: boolean;
  error: string | null;
  citations: VisibilityCitation[];
}

interface Citation {
  website?: string;
  domain?: string;
  source?: string;
  link?: string;
  url?: string;
  title?: string;
  brandMentioned?: boolean;
  brandMentionContext?: string;
}

interface DetailedResult {
  model: string;
  promptIndex: number;
  brandMentioned: boolean;
  originalPrompt: string;
  citations: Citation[];
  usedWebSearch?: boolean;
}

export function useVisibilityCitations(
  projectId: string | null,
  selectedModels: string[],
  token: string | null,
  isAllTime: boolean = false,
  dateRange?: { startDate: Date; endDate: Date },
  isLatest: boolean = false
): UseVisibilityCitationsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citations, setCitations] = useState<VisibilityCitation[]>([]);
  
  // Memoize dependency values to prevent unnecessary re-renders
  const selectedModelsKey = useMemo(() => selectedModels.sort().join(','), [selectedModels]);
  const dateRangeKey = useMemo(() => {
    if (!dateRange) return '';
    return `${dateRange.startDate.getTime()}-${dateRange.endDate.getTime()}`;
  }, [dateRange?.startDate, dateRange?.endDate]);
  
  // Fetch visibility citations from aggregated visibility data
  useEffect(() => {
    const fetchCitations = async () => {
      if (!token || !projectId) {
        setCitations([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Build query parameters
        const queryParams: any = {
          models: selectedModels,
          includeVariation: false,
        };

        if (isLatest) {
          queryParams.latestOnly = true;
        } else if (dateRange && !isAllTime) {
          queryParams.startDate = dateRange.startDate.toISOString();
          queryParams.endDate = dateRange.endDate.toISOString();
        }

        // Call aggregated visibility API
        const response = await getAggregatedVisibility(projectId, token, queryParams);
        
        console.log('[useVisibilityCitations] Aggregated response:', response);

        const allCitations: VisibilityCitation[] = [];

        // Extract citations from detailedResults
        if (response.detailedResults && Array.isArray(response.detailedResults)) {
          let totalDetailedResults = 0;
          let resultsWithCitations = 0;
          
          response.detailedResults.forEach((result: DetailedResult) => {
            // Apply model filter
            if (selectedModels.length === 0 || selectedModels.includes(result.model)) {
              totalDetailedResults++;
              // Process each citation in this result
              if (result.citations && Array.isArray(result.citations) && result.citations.length > 0) {
                resultsWithCitations++;
                result.citations.forEach((citation) => {
                  const url = citation.url || citation.link || '';
                  
                  // Skip citations without URLs
                  if (!url) {
                    console.log('[useVisibilityCitations] Skipping citation without URL:', citation);
                    return;
                  }
                  
                  // Extract domain from URL
                  let domain = '';
                  if (url) {
                    try {
                      const urlObj = new URL(url);
                      domain = urlObj.hostname.replace(/^www\./, '');
                    } catch (e) {
                      // If URL parsing fails, fallback to other fields
                      domain = citation.website || citation.domain || citation.source || '';
                    }
                  }
                  
                  allCitations.push({
                    website: domain, // This is used for the Domain column
                    link: url, // This is used for the URL column
                    model: result.model,
                    promptType: 'visibility',
                    promptIndex: result.promptIndex,
                    promptText: result.originalPrompt,
                    // Use the brandMentioned from detailedResult level - this indicates if brand was mentioned in the LLM response
                    brandMentioned: result.brandMentioned === true,
                    brandMentionContext: citation.brandMentionContext || '',
                    title: citation.title || '',
                  });
                });
              }
            }
          });
          
          console.log('[useVisibilityCitations] Stats:', {
            totalDetailedResults,
            resultsWithCitations,
            totalCitations: allCitations.length,
            citationsSkippedNoUrl: response.detailedResults.reduce((count: number, result: DetailedResult) => {
              if (selectedModels.length === 0 || selectedModels.includes(result.model)) {
                if (result.citations && Array.isArray(result.citations)) {
                  return count + result.citations.filter((c: any) => !c.url && !c.link).length;
                }
              }
              return count;
            }, 0),
          });
        }
        
        console.log('[useVisibilityCitations] Total citations extracted:', allCitations.length);
        setCitations(allCitations);
      } catch (err) {
        console.error("Failed to fetch visibility citations:", err);
        setError("Failed to load citations data");
        setCitations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCitations();
  }, [projectId, selectedModelsKey, token, isAllTime, dateRangeKey, isLatest]);

  return {
    loading,
    error,
    citations,
  };
}