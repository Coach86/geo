"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Globe,
  Database,
  Link as LinkIcon,
  Download,
} from "lucide-react";
import { CitationsTable } from "@/components/explorer/CitationsTable";
import {
  getPromptSet,
  PromptSet,
} from "@/lib/auth-api";
import type { ReportResponse } from "@/types/reports";
import { ReportRangeSelector } from "@/components/shared/ReportRangeSelector";
import { useAggregatedExplorer } from "@/hooks/use-aggregated-explorer";
import { useReports } from "@/providers/report-provider";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { useNavigation } from "@/providers/navigation-provider";
import { ProcessingLoader } from "@/components/shared/ProcessingLoader";
import { useNotificationContext } from "@/providers/notification-provider";


export default function ExplorerPage() {
  const { token } = useAuth();
  const { filteredProjects, selectedProject, setSelectedProject } = useNavigation();
  const { subscribeToProject } = useNotificationContext();
  const { reports, loadingReports, fetchReports } = useReports();
  
  // Get selected project from localStorage
  const selectedProjectId = typeof window !== 'undefined'
    ? localStorage.getItem('selectedProjectId')
    : null;

  const projectReports = selectedProjectId ? reports[selectedProjectId] || [] : [];
  const brandName = selectedProject?.brandName || 'Brand';

  // State for date range and model filters
  const [selectedReports, setSelectedReports] = useState<ReportResponse[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [isAllTime, setIsAllTime] = useState<boolean>(false);
  const [promptSet, setPromptSet] = useState<PromptSet | null>(null);
  const [keywordFilter, setKeywordFilter] = useState<string>("");
  const [filteringKeyword, setFilteringKeyword] = useState<string>("");

  // Subscribe to project notifications
  useEffect(() => {
    if (selectedProjectId) {
      subscribeToProject(selectedProjectId);
    }
  }, [selectedProjectId, subscribeToProject]);

  // Fetch reports when project changes
  useEffect(() => {
    if (selectedProjectId && token) {
      fetchReports(selectedProjectId, token);
    }
  }, [selectedProjectId, token, fetchReports]);

  // Memoize the date range object to prevent infinite re-renders
  const memoizedDateRange = useMemo(() => {
    return dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined;
  }, [dateRange?.start, dateRange?.end]);

  // Use aggregated explorer hook for date range data
  const {
    loading: loadingExplorer,
    error: explorerError,
    topKeywords,
    topSources,
    summary,
    citations,
    webSearchResults,
  } = useAggregatedExplorer(selectedProjectId, token, memoizedDateRange);

  // Handle date range change
  const handleRangeChange = useCallback((start: Date, end: Date, reports: ReportResponse[], isAllTimeRange?: boolean) => {
    console.log('[ExplorerPage] handleRangeChange called with:', {
      start: start.toISOString(),
      end: end.toISOString(),
      reportsCount: reports.length,
      isAllTimeRange
    });
    
    setDateRange(prev => {
      // Only update if dates actually changed
      if (prev?.start.getTime() === start.getTime() && prev?.end.getTime() === end.getTime()) {
        console.log('[ExplorerPage] Date range unchanged, skipping update');
        return prev;
      }
      console.log('[ExplorerPage] Date range changed, updating');
      return { start, end };
    });
    setSelectedReports(reports);
    setIsAllTime(isAllTimeRange || false);
  }, []);

  // Handle model filter change
  const handleModelFilterChange = useCallback((models: string[]) => {
    setSelectedModels(models);
  }, []);

  // Fetch prompt set when selected project changes
  useEffect(() => {
    const fetchPromptSet = async () => {
      if (!selectedProjectId || !token) {
        setPromptSet(null);
        return;
      }

      try {
        const prompts = await getPromptSet(selectedProjectId, token);
        setPromptSet(prompts);
      } catch (err) {
        console.error("Failed to fetch prompt set:", err);
        // Don't set error for prompt set, it's optional
        setPromptSet(null);
      }
    };

    fetchPromptSet();
  }, [selectedProjectId, token]);


  // Get prompt text based on type and index
  const getPromptText = (promptType?: string, promptIndex?: number): string | null => {
    if (!promptSet || promptType === undefined || promptIndex === undefined) {
      return null;
    }

    // Map old prompt types to new ones for backward compatibility
    const promptTypeMap: Record<string, string[]> = {
      // New names
      visibility: promptSet.visibility || [],
      sentiment: promptSet.sentiment || [],
      alignment: promptSet.alignment || [],
      competition: promptSet.competition || [],
      // Old names for backward compatibility
      spontaneous: promptSet.visibility || [],
      direct: promptSet.sentiment || [],
      accuracy: promptSet.alignment || [],
      brandBattle: promptSet.competition || [],
    };

    const prompts = promptTypeMap[promptType];
    if (prompts && promptIndex >= 0 && promptIndex < prompts.length) {
      return prompts[promptIndex];
    }

    return null;
  };

  // Pre-compute prompt texts for all citations
  const citationsWithPromptText = useMemo(() => {
    if (!citations || !citations.length) return [];
    
    return citations.map(citation => ({
      ...citation,
      promptText: getPromptText(citation.promptType, citation.promptIndex)
    }));
  }, [citations, promptSet]);

  // Create explorer data structure
  const explorerData = useMemo(() => {
    if (!selectedReports.length || !summary) return null;
    
    return {
      summary: {
        totalPrompts: summary.totalPrompts,
        promptsWithWebAccess: summary.promptsWithWebAccess,
        webAccessPercentage: summary.webAccessPercentage,
        totalCitations: summary.totalCitations,
        uniqueSources: summary.uniqueSources,
      },
      topKeywords,
      topSources,
      citations: citations || [],
      webSearchResults: webSearchResults || []
    };
  }, [selectedReports, summary, topKeywords, topSources, citations, webSearchResults]);

  // Export citations to CSV
  const exportToCSV = useCallback(() => {
    if (!explorerData) return;

    const headers = ["Search Query", "Source", "Link", "Model", "Prompt Category", "Prompt Detail"];
    const rows: string[][] = [];
    
    // Use new structure if available
    if (explorerData.webSearchResults && explorerData.webSearchResults.length > 0) {
      explorerData.webSearchResults.forEach((searchResult) => {
        searchResult.citations.forEach((citation: any) => {
          const promptText = getPromptText(citation.promptType, citation.promptIndex) || "N/A";
          rows.push([
            searchResult.query,
            citation.website,
            citation.link || "No link",
            citation.model,
            citation.promptType,
            promptText,
          ]);
        });
      });
    } else if (citationsWithPromptText && citationsWithPromptText.length > 0) {
      // Fallback to old structure
      citationsWithPromptText.forEach((citation) => {
        const promptText = citation.promptText || "N/A";
        
        if (citation.webSearchQueries && citation.webSearchQueries.length > 0) {
          citation.webSearchQueries.forEach((queryObj: any) => {
            rows.push([
              queryObj.query,
              citation.website,
              citation.link || "No link",
              citation.model || "Unknown",
              citation.promptType || "Unknown",
              promptText,
            ]);
          });
        } else {
          rows.push([
            "No search query",
            citation.website,
            citation.link || "No link",
            citation.model || "Unknown",
            citation.promptType || "Unknown",
            promptText,
          ]);
        }
      });
    }

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `citations_${new Date().toISOString().split('T')[0].replace(/-/g, "_")}.csv`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [explorerData, citationsWithPromptText]);

  const loading = loadingReports[selectedProjectId || ''] || loadingExplorer;
  const error = explorerError;

  if (!selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a project from the sidebar to view explorer
                  data.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation with new Report Range Selector */}
      <div className="flex items-center justify-between">
        {token && filteredProjects.length > 0 && (
          <BreadcrumbNav
            projects={filteredProjects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
            currentPage="Explorer"
            showReportSelector={false}
            token={token}
          />
        )}
        {projectReports.length > 0 && selectedProjectId && (
          <ReportRangeSelector
            reports={projectReports}
            projectId={selectedProjectId}
            availableModels={availableModels}
            onRangeChange={handleRangeChange}
            onModelFilterChange={handleModelFilterChange}
          />
        )}
      </div>


      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Explorer Content */}
      {!loading && selectedReports.length > 0 && explorerData && (
        <div className="space-y-6 fade-in-section is-visible">
          {/* First Row: Three Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tracked Responses */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  Total prompts executed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-purple-600">
                    {explorerData.summary.totalPrompts || 0}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Number of Citations */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-blue-600" />
                  Total links consulted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-blue-600">
                    {explorerData.summary.totalCitations || 0}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Sources */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-green-600" />
                  Total sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-green-600">
                    {explorerData.summary.uniqueSources || 0}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>



          {/* Second Row: Full Width Citations Table */}
          <Card className={`
            border-0 shadow-sm hover:shadow-md transition-all duration-300
            ${filteringKeyword ? "animate-pulse" : ""}
            ${keywordFilter ? "ring-2 ring-blue-200 ring-opacity-50" : ""}
          `}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Database className="h-5 w-5 text-purple-600" />
                    All Citations
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Complete list of sources cited in AI responses with advanced filtering and sorting
                  </p>
                </div>
                {keywordFilter && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 animate-in fade-in-0 slide-in-from-right-5 duration-300">
                      <span className="text-xs">🔍</span> Filtered by: {keywordFilter}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setKeywordFilter("");
                        setFilteringKeyword("");
                      }}
                      className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600 transition-colors"
                      title="Clear filter"
                    >
                      ✕
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CitationsTable
                citations={citationsWithPromptText}
                webSearchResults={explorerData.webSearchResults}
                onExport={exportToCSV}
                searchQueryFilter={keywordFilter}
                promptSet={promptSet}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Reports State */}
      {!loading && projectReports.length === 0 && selectedProjectId && (
        <ProcessingLoader />
      )}

      {/* No Selected Reports */}
      {!loading && projectReports.length > 0 && selectedReports.length === 0 && (
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a date range to view explorer data.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
