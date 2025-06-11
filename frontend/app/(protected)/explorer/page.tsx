"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  Globe,
  Search,
  ExternalLink,
  TrendingUp,
  Database,
  Link as LinkIcon,
  Download,
  Brain,
  Hash,
} from "lucide-react";
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
  
  // Filter states
  const [queryFilter, setQueryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [linkFilter, setLinkFilter] = useState("");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [promptTypeFilter, setPromptTypeFilter] = useState<string>("all");
  const [promptDetailFilter, setPromptDetailFilter] = useState<string>("all");

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


  // Get domain for URL display
  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

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

  // Process and group citations by query with filters
  const processedCitations = useMemo(() => {
    if (!citationsWithPromptText.length) return new Map();
    
    const citationsByQuery = new Map<string, typeof citationsWithPromptText>();
    
    // First pass: filter citations
    const filteredCitations = citationsWithPromptText.filter(citation => {
      // Apply model filter
      if (modelFilter !== "all" && citation.model !== modelFilter) return false;
      
      // Apply prompt type filter
      if (promptTypeFilter !== "all" && citation.promptType !== promptTypeFilter) return false;
      
      // Apply link filter
      if (linkFilter && (!citation.link || !citation.link.toLowerCase().includes(linkFilter.toLowerCase()))) {
        return false;
      }
      
      // Apply prompt detail filter
      if (promptDetailFilter !== "all") {
        if (promptDetailFilter === "N/A") {
          if (citation.promptText) return false;
        } else {
          if (!citation.promptText || !citation.promptText.includes(promptDetailFilter)) return false;
        }
      }
      
      // Apply source filter
      if (sourceFilter && !citation.website.toLowerCase().includes(sourceFilter.toLowerCase())) {
        return false;
      }
      
      return true;
    });
    
    // Second pass: group by query
    filteredCitations.forEach((citation) => {
      if (citation.webSearchQueries && citation.webSearchQueries.length > 0) {
        citation.webSearchQueries.forEach((queryObj) => {
          const query = queryObj.query;
          
          // Apply query filter
          if (queryFilter && !query.toLowerCase().includes(queryFilter.toLowerCase())) {
            return;
          }
          
          if (!citationsByQuery.has(query)) {
            citationsByQuery.set(query, []);
          }
          citationsByQuery.get(query)!.push(citation);
        });
      } else {
        const noQueryKey = 'No search query';
        
        // Apply query filter
        if (queryFilter && !noQueryKey.toLowerCase().includes(queryFilter.toLowerCase())) {
          return;
        }
        
        if (!citationsByQuery.has(noQueryKey)) {
          citationsByQuery.set(noQueryKey, []);
        }
        citationsByQuery.get(noQueryKey)!.push(citation);
      }
    });
    
    return citationsByQuery;
  }, [citationsWithPromptText, queryFilter, sourceFilter, linkFilter, modelFilter, promptTypeFilter, promptDetailFilter]);

  // Get unique values for filters
  const uniqueModels = useMemo(() => {
    if (!citationsData) return [];
    const models = new Set(citationsData.citations.map(c => c.model || "Unknown"));
    return Array.from(models).sort();
  }, [citationsData]);

  const uniquePromptTypes = useMemo(() => {
    if (!citationsData) return [];
    const types = new Set(citationsData.citations.map(c => c.promptType || "Unknown"));
    return Array.from(types).sort();
  }, [citationsData]);
  
  const uniquePromptDetails = useMemo(() => {
    if (!citationsWithPromptText.length) return [];
    const detailsMap = new Map<string, string>();
    
    citationsWithPromptText.forEach((citation) => {
      if (citation.promptText && !detailsMap.has(citation.promptText)) {
        // Store full text as key, shortened text as display value
        const shortText = citation.promptText.length > 50 ? `${citation.promptText.substring(0, 50)}...` : citation.promptText;
        detailsMap.set(citation.promptText, shortText);
      }
    });
    
    // Return array of objects with full and short text
    return Array.from(detailsMap.entries())
      .map(([full, short]) => ({ full, short }))
      .sort((a, b) => a.short.localeCompare(b.short));
  }, [citationsWithPromptText]);
  
  // Calculate total displayed entries
  const totalDisplayed = useMemo(() => {
    let count = 0;
    processedCitations.forEach((citations) => {
      count += citations.length;
    });
    return count;
  }, [processedCitations]);

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
  const exportToCSV = () => {
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
  };

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
                      {new Set(citationsData.citations.map(c => getDomain(c.website || c.link || ''))).size}
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
              <CardHeader className="pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Database className="h-5 w-5 text-purple-600" />
                      All Citations
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({totalDisplayed} {totalDisplayed === 1 ? 'entry' : 'entries'} displayed)
                      </span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Complete list of sources cited in AI responses
                    </p>
                  </div>
                  <Button
                    onClick={exportToCSV}
                    variant="outline"
                    size="sm"
                    disabled={
                      !citationsData || citationsData.citations.length === 0
                    }
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export All to CSV
                  </Button>
                </div>
                
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                  <table className="w-full min-w-[1000px] border-collapse table-fixed">
                      <colgroup>
                        <col className="w-[25%]" />
                        <col className="w-[20%]" />
                        <col className="w-[20%]" />
                        <col className="w-[10%]" />
                        <col className="w-[15%]" />
                        <col className="w-[10%]" />
                      </colgroup>
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                            <div className="space-y-2">
                              <div>Search Queries</div>
                              <Input
                                placeholder="Filter queries..."
                                value={queryFilter}
                                onChange={(e) => setQueryFilter(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                            <div className="space-y-2">
                              <div>Source</div>
                              <Input
                                placeholder="Filter sources..."
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                            <div className="space-y-2">
                              <div>Link</div>
                              <Input
                                placeholder="Filter links..."
                                value={linkFilter}
                                onChange={(e) => setLinkFilter(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                            <div className="space-y-2">
                              <div>Model</div>
                              <Select value={modelFilter} onValueChange={setModelFilter}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Models</SelectItem>
                                  {uniqueModels.map((model) => (
                                    <SelectItem key={model} value={model}>
                                      {model}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                            <div className="space-y-2">
                              <div>Prompt Category</div>
                              <Select value={promptTypeFilter} onValueChange={setPromptTypeFilter}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Types</SelectItem>
                                  {uniquePromptTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                            <div className="space-y-2">
                              <div>Prompt Detail</div>
                              <Select value={promptDetailFilter} onValueChange={setPromptDetailFilter}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Details</SelectItem>
                                  <SelectItem value="N/A">N/A</SelectItem>
                                  {uniquePromptDetails.map((detail) => (
                                    <SelectItem key={detail.full} value={detail.full}>
                                      {detail.short}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedCitations.size > 0 ? (
                          (() => {
                            const rows: JSX.Element[] = [];
                            
                            processedCitations.forEach((citations, query) => {
                              citations.forEach((citation, citationIndex) => {
                                const isFirstInGroup = citationIndex === 0;
                                const isLastInGroup = citationIndex === citations.length - 1;
                                const promptText = citation.promptText;
                                
                                rows.push(
                                  <tr key={`${query}-${citationIndex}`} className="hover:bg-gray-50">
                                    <td 
                                      className={`px-4 py-3 border-b ${isLastInGroup ? 'border-gray-300' : 'border-gray-200'}`}
                                      rowSpan={isFirstInGroup ? citations.length : undefined}
                                      style={isFirstInGroup ? {} : { display: 'none' }}
                                    >
                                      {isFirstInGroup && (
                                        <div className="space-y-1">
                                          <div className="flex flex-wrap gap-1">
                                            <Badge
                                              variant="outline"
                                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                            >
                                              <Search className="h-3 w-3 mr-1" />
                                              {query === 'No search query' ? (
                                                <span className="italic">{query}</span>
                                              ) : (
                                                query
                                              )}
                                            </Badge>
                                          </div>
                                          {citations.length > 1 && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              {citations.length} results
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td className={`px-4 py-3 border-b ${isLastInGroup ? 'border-gray-300' : 'border-gray-200'}`}>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="font-medium text-gray-900 truncate cursor-default">
                                                {citation.website}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="max-w-xs break-all">{citation.website}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                    </td>
                                    <td className={`px-4 py-3 border-b ${isLastInGroup ? 'border-gray-300' : 'border-gray-200'}`}>
                                      {citation.link ? (
                                        <a
                                          href={citation.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors duration-200"
                                        >
                                          <span className="text-sm">
                                            {getDomain(citation.link)}
                                          </span>
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : (
                                        <span className="text-sm text-gray-400 italic">
                                          No link
                                        </span>
                                      )}
                                    </td>
                                    <td className={`px-4 py-3 border-b ${isLastInGroup ? 'border-gray-300' : 'border-gray-200'}`}>
                                      <span className="text-sm text-gray-900">
                                        {citation.model || 'Unknown'}
                                      </span>
                                    </td>
                                    <td className={`px-4 py-3 border-b ${isLastInGroup ? 'border-gray-300' : 'border-gray-200'}`}>
                                      <Badge variant="outline" className="text-xs">
                                        {citation.promptType || 'Unknown'}
                                      </Badge>
                                    </td>
                                    <td className={`px-4 py-3 border-b ${isLastInGroup ? 'border-gray-300' : 'border-gray-200'}`}>
                                      <div className="max-w-xs">
                                        {promptText ? (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div className="text-sm text-gray-700 cursor-help line-clamp-2 overflow-hidden">
                                                  {promptText}
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent side="left" className="max-w-md">
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{promptText}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        ) : (
                                          <span className="text-sm text-gray-400 italic">N/A</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              });
                            });
                            
                            return rows;
                          })()
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                <Database className="h-8 w-8 text-gray-300" />
                                <p className="text-sm">No citations match your filters</p>
                                <p className="text-xs text-gray-400">Try adjusting your search criteria</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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
