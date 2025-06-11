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
  TrendingUp,
  Database,
  Download,
  Brain,
  Hash,
  Link as LinkIcon,
} from "lucide-react";
import { CitationsTable } from "@/components/explorer/CitationsTable";
import {
  getReportCitations,
  CitationsData,
  getReportSpontaneous,
  SpontaneousData,
  getPromptSet,
  PromptSet,
} from "@/lib/auth-api";
import type { ReportResponse } from "@/types/reports";
import { ReportSelector } from "@/components/shared/ReportSelector";
import { useReportData } from "@/hooks/use-report-data";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { useNavigation } from "@/providers/navigation-provider";
import { ProcessingLoader } from "@/components/shared/ProcessingLoader";

interface ProcessedReport extends ReportResponse {
  createdAt: string;
  reportDate: string;
}

export default function CitationsPage() {
  const { token } = useAuth();
  const { filteredProjects, selectedProject, setSelectedProject } = useNavigation();
  const {
    selectedProjectId,
    projectDetails,
    selectedReport,
    setSelectedReport,
    loading,
    error
  } = useReportData<ProcessedReport>((report, project) => {
    return {
      ...report,
      reportDate: report.metadata?.date || report.generatedAt,
      createdAt: report.generatedAt,
    };
  });

  const [citationsData, setCitationsData] = useState<CitationsData | null>(null);
  const [loadingCitations, setLoadingCitations] = useState(false);
  const [citationsError, setCitationsError] = useState<string | null>(null);
  const [spontaneousData, setSpontaneousData] = useState<SpontaneousData | null>(null);
  const [loadingSpontaneous, setLoadingSpontaneous] = useState(false);
  const [promptSet, setPromptSet] = useState<PromptSet | null>(null);
  const [expandedSources, setExpandedSources] = useState(false);

  // Fetch citations when selected report changes
  useEffect(() => {
    const fetchCitations = async () => {
      if (!selectedReport || !token) {
        setCitationsData(null);
        return;
      }

      setLoadingCitations(true);
      setCitationsError(null);

      try {
        const data = await getReportCitations(selectedReport.id, token);
        setCitationsData(data);
      } catch (err) {
        console.error("Failed to fetch citations:", err);
        setCitationsError("Failed to load citations data. Please try again later.");
      } finally {
        setLoadingCitations(false);
      }
    };

    fetchCitations();
  }, [selectedReport, token]);

  // Fetch spontaneous data when selected report changes
  useEffect(() => {
    const fetchSpontaneous = async () => {
      if (!selectedReport || !token) {
        setSpontaneousData(null);
        return;
      }

      setLoadingSpontaneous(true);
      try {
        const data = await getReportSpontaneous(selectedReport.id, token);
        setSpontaneousData(data);
      } catch (err) {
        console.error("Failed to fetch spontaneous data:", err);
        // Don't show error for spontaneous data, just log it
        setSpontaneousData(null);
      } finally {
        setLoadingSpontaneous(false);
      }
    };

    fetchSpontaneous();
  }, [selectedReport, token]);

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

    const promptTypeMap: Record<string, string[]> = {
      spontaneous: promptSet.spontaneous,
      direct: promptSet.direct,
      comparison: promptSet.comparison,
      accuracy: promptSet.accuracy,
      brandBattle: promptSet.brandBattle,
    };

    const prompts = promptTypeMap[promptType];
    if (prompts && promptIndex >= 0 && promptIndex < prompts.length) {
      return prompts[promptIndex];
    }

    return null;
  };

  // Pre-compute prompt texts for all citations
  const citationsWithPromptText = useMemo(() => {
    if (!citationsData) return [];
    
    return citationsData.citations.map(citation => ({
      ...citation,
      promptText: getPromptText(citation.promptType, citation.promptIndex)
    }));
  }, [citationsData, promptSet]);

  // Calculate total unfiltered citations (how they would appear in the table)
  const totalUnfilteredCitations = useMemo(() => {
    if (!citationsData) return 0;
    
    let count = 0;
    citationsData.citations.forEach((citation) => {
      if (citation.webSearchQueries && citation.webSearchQueries.length > 0) {
        // This citation will appear once for each query
        count += citation.webSearchQueries.length;
      } else {
        // This citation will appear once under "No search query"
        count += 1;
      }
    });
    return count;
  }, [citationsData]);

  // Export citations to CSV
  const exportToCSV = useCallback(() => {
    if (!citationsData || citationsData.citations.length === 0) return;

    // Use all data for export (not filtered)
    const headers = ["Search Query", "Source", "Link", "Model", "Prompt Category", "Prompt Detail"];

    // Prepare CSV rows from all data
    const rows: string[][] = [];
    
    citationsWithPromptText.forEach((citation) => {
      const promptText = citation.promptText || "N/A";
      
      if (citation.webSearchQueries && citation.webSearchQueries.length > 0) {
        citation.webSearchQueries.forEach((queryObj) => {
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
      `citations_${(selectedReport?.reportDate || new Date().toISOString())
        .split('T')[0].replace(/-/g, "_")}.csv`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [citationsWithPromptText, selectedReport]);

  if (!selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a project from the sidebar to view citations
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
        {/* Breadcrumb Navigation */}
        {token && filteredProjects.length > 0 && (
          <BreadcrumbNav
            projects={filteredProjects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
            currentPage="Citations"
            showReportSelector={true}
            token={token}
            onReportSelect={(report) => {
              if (!report) {
                setSelectedReport(null);
                return;
              }
              // Transform ReportResponse to ProcessedReport
              const processedReport: ProcessedReport = {
                ...report,
                reportDate: report.metadata?.date || report.generatedAt,
                createdAt: report.generatedAt,
              };
              setSelectedReport(processedReport);
            }}
          />
        )}


        {/* Error State */}
        {(error || citationsError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || citationsError}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {(loading || loadingCitations) && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
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

        {/* Citations Content */}
        {!loading && !loadingCitations && selectedReport && citationsData && (
          <div className="space-y-6">
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
                      {citationsData.webAccess.totalResponses || 0}
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
                      {totalUnfilteredCitations}
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
                      {new Set(citationsData.citations.map(c => {
                        const url = c.website || c.link || '';
                        try {
                          const urlObj = new URL(url);
                          return urlObj.hostname.replace("www.", "");
                        } catch {
                          return url;
                        }
                      })).size}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Second Row: Three Columns - Top Mentions, Keywords, Sources */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top 10 Mentions */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-accent-600" />
                    Top 10 Mentions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSpontaneous ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-gray-500">Loading...</div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {spontaneousData?.summary?.topMentionCounts?.slice(0, 10).map((item, index) => (
                        <Badge
                          key={index}
                          variant={index < 3 ? "default" : "outline"}
                          className={`
                            ${index < 3
                              ? "bg-secondary-100 text-secondary-800 border-secondary-200"
                              : "border-gray-300 text-gray-700"
                            }
                            text-sm font-medium px-3 py-1
                          `}
                        >
                          {item.mention} ({item.count})
                          {index === 0 && (
                            <span className="ml-1 text-xs">
                              👑
                            </span>
                          )}
                        </Badge>
                      )) || spontaneousData?.summary?.topMentions?.slice(0, 10).map((mention, index) => (
                        <Badge
                          key={index}
                          variant={index < 3 ? "default" : "outline"}
                          className={`
                            ${index < 3
                              ? "bg-secondary-100 text-secondary-800 border-secondary-200"
                              : "border-gray-300 text-gray-700"
                            }
                            text-sm font-medium px-3 py-1
                          `}
                        >
                          {mention}
                          {index === 0 && (
                            <span className="ml-1 text-xs">
                              👑
                            </span>
                          )}
                        </Badge>
                      )) || (
                        <p className="text-sm text-gray-400 italic">
                          No mentions found
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top 10 Keywords */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Hash className="h-5 w-5 text-purple-600" />
                    Top 10 Keywords
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {citationsData.topKeywords && citationsData.topKeywords.length > 0 ? (
                      citationsData.topKeywords.slice(0, 10).map((item, index) => (
                        <Badge
                          key={index}
                          variant={index < 3 ? "default" : "outline"}
                          className={`
                            ${index < 3
                              ? "bg-purple-100 text-purple-800 border-purple-200"
                              : "border-gray-300 text-gray-700"
                            }
                            text-sm font-medium px-3 py-1
                          `}
                        >
                          {item.keyword} ({item.count})
                          {index === 0 && (
                            <span className="ml-1 text-xs">
                              🔍
                            </span>
                          )}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 italic">
                        No keywords available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Sources */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Top {expandedSources ? '10' : '5'} Sources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {citationsData.topSources.length > 0 ? (
                      <>
                        {citationsData.topSources.slice(0, expandedSources ? 10 : 5).map((source, index) => (
                          <div
                            key={source.domain}
                            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">
                                #{index + 1}
                              </span>
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {source.domain}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {source.count}
                            </Badge>
                          </div>
                        ))}
                        {citationsData.topSources.length > 5 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedSources(!expandedSources)}
                            className="w-full mt-2 text-gray-600 hover:text-gray-900"
                          >
                            {expandedSources ? 'Show less' : `Show ${Math.min(5, citationsData.topSources.length - 5)} more`}
                          </Button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 italic">
                        No sources found
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>


            {/* Third Row: Full Width Citations Table */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  All Citations
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Complete list of sources cited in AI responses with advanced filtering and sorting
                </p>
              </CardHeader>
              <CardContent>
                <CitationsTable
                  citations={citationsWithPromptText}
                  onExport={exportToCSV}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Reports State */}
        {!loading && !selectedReport && selectedProjectId && (
          <ProcessingLoader />
        )}
      </div>
  );
}
