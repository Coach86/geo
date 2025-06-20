"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useFeatureGate } from "@/hooks/use-feature-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import type { ReportResponse } from "@/types/reports";
import { SentimentMetricsCard } from "@/components/sentiment/SentimentMetricsCard";
import { SentimentTrendChart } from "@/components/sentiment/SentimentTrendChart";
import { SentimentHeatmap } from "@/components/sentiment/SentimentHeatmap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { useNavigation } from "@/providers/navigation-provider";
import { useReports } from "@/providers/report-provider";
import { ProcessingLoader } from "@/components/shared/ProcessingLoader";
import { ReportRangeSelector } from "@/components/shared/ReportRangeSelector";
import { useSentimentReports } from "@/hooks/use-sentiment-reports";
import { getModelFriendlyName } from "@/utils/model-utils";
import { FeatureLockedWrapper } from "@/components/shared/FeatureLockedWrapper";
import { getMockSentimentData } from "@/lib/mock-data";
import { SourcesWatchtower } from "@/components/shared/SourcesWatchtower";
import { SourcesAnalysis } from "@/components/shared/SourcesAnalysis";

export default function SentimentPage() {
  const { token } = useAuth();
  const { hasAccess, isLoading: accessLoading, isFreePlan } = useFeatureGate("sentiment");
  const { allProjects, selectedProject, setSelectedProject } = useNavigation();
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
  const [isLatest, setIsLatest] = useState<boolean>(false);

  // Memoize the date range object to prevent infinite re-renders
  const memoizedDateRange = useMemo(() => {
    return dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined;
  }, [dateRange?.start, dateRange?.end]);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [selectedHeatmapReport, setSelectedHeatmapReport] = useState<ReportResponse | null>(null);

  // Drawer state for detailed model analysis
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [selectedLlmResponse, setSelectedLlmResponse] = useState<string | null>(null);
  const [selectedModelData, setSelectedModelData] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch reports when project changes
  useEffect(() => {
    if (selectedProjectId && token) {
      fetchReports(selectedProjectId, token);
    }
  }, [selectedProjectId, token, fetchReports]);

  // Hooks for sentiment data
  const {
    loading: loadingSentiment,
    error: sentimentError,
    averageScore,
    scoreVariation,
    distribution,
    distributionVariations,
    chartData,
    aggregatedHeatmap,
    availableModels: sentimentAvailableModels,
    citations,
  } = useSentimentReports(selectedProjectId, selectedModels, token, isAllTime, memoizedDateRange, isLatest);
  
  // Debug logging for citations
  useEffect(() => {
    console.log('SentimentPage - citations from hook:', citations);
  }, [citations]);
  
  // State for storing heatmap report sentiment data
  const [heatmapSentimentData, setHeatmapSentimentData] = useState<any>(null);

  // Handle date range change
  const handleRangeChange = useCallback((start: Date, end: Date, reports: ReportResponse[], isAllTimeRange?: boolean, isLatestReport?: boolean) => {
    console.log('[SentimentPage] handleRangeChange called with:', {
      start: start.toISOString(),
      end: end.toISOString(),
      reportsCount: reports.length,
      isAllTimeRange,
      isLatestReport
    });
    
    setDateRange(prev => {
      // Only update if dates actually changed
      if (prev?.start.getTime() === start.getTime() && prev?.end.getTime() === end.getTime()) {
        console.log('[SentimentPage] Date range unchanged, skipping update');
        return prev;
      }
      console.log('[SentimentPage] Date range changed, updating');
      return { start, end };
    });
    setSelectedReports(reports);
    setIsAllTime(isAllTimeRange || false);
    setIsLatest(isLatestReport || false);
  }, []);

  // Update available models when sentiment data changes
  useEffect(() => {
    if (sentimentAvailableModels && sentimentAvailableModels.length > 0) {
      // Only update if the models have actually changed
      const modelsChanged = JSON.stringify(availableModels) !== JSON.stringify(sentimentAvailableModels);
      if (modelsChanged) {
        setAvailableModels(sentimentAvailableModels);
        // Select all models by default when they become available for the first time
        if (selectedModels.length === 0 && availableModels.length === 0) {
          setSelectedModels(sentimentAvailableModels);
        }
      }
    }
  }, [sentimentAvailableModels, selectedModels, availableModels]);

  // Handle model filter change
  const handleModelFilterChange = useCallback((models: string[]) => {
    setSelectedModels(models);
  }, []);

  // Handle cell click from heatmap
  const handleCellClick = (model: string, sentiment: string, status: string, question: string, llmResponse?: string, modelData?: any) => {
    setSelectedModel(model);
    setSelectedStatus(status);
    setSelectedQuestion(question);
    setSelectedLlmResponse(llmResponse || null);
    
    // Find the full result data from the heatmap sentiment data
    const fullResult = heatmapSentimentData?.heatmapData?.find(
      (item: any) => item.question === question
    )?.results?.find((result: any) => result.model === model);
    
    // Find the model sentiment data that includes keywords
    const modelSentimentData = heatmapSentimentData?.modelSentiments?.find(
      (ms: any) => ms.model === model
    );
    
    // Combine full result with model sentiment data for keywords
    const combinedData = {
      ...fullResult,
      positiveKeywords: modelSentimentData?.positiveKeywords || [],
      negativeKeywords: modelSentimentData?.negativeKeywords || [],
    };
    
    setSelectedModelData(combinedData || modelData || null);
    setIsDrawerOpen(true);
  };

  // Get model data for drawer
  const getModelData = () => {
    if (!selectedModel || !selectedModelData) {
      // Fallback to empty data if no model data is available
      return {
        model: selectedModel || '',
        sentiment: selectedStatus === "green" ? "positive" : selectedStatus === "red" ? "negative" : "neutral",
        status: selectedStatus || "yellow",
        positiveKeywords: [],
        negativeKeywords: [],
        toolUsage: [],
        citations: [],
      };
    }
    
    return {
      model: selectedModel,
      sentiment: selectedStatus === "green" ? "positive" : selectedStatus === "red" ? "negative" : "neutral",
      status: selectedStatus || "yellow",
      positiveKeywords: selectedModelData.positiveKeywords || [],
      negativeKeywords: selectedModelData.negativeKeywords || [],
      toolUsage: selectedModelData.toolUsage || [],
      citations: selectedModelData.citations || [],
    };
  };

  // Helper function to get position based on status
  const getSentimentPositionByStatus = (status: string) => {
    switch (status) {
      case "red":
        return 0; // Negative position (far left)
      case "yellow":
        return 49; // Neutral position (center)
      case "green":
        return 98; // Positive position (far right)
      default:
        return 49; // Default to neutral
    }
  };

  // Helper function to get cell color
  const getCellColor = (status: string) => {
    switch (status) {
      case "green":
        return {
          bg: "rgb(4 191 145 / 0.05)",
          text: "rgb(4 191 145)",
          border: "rgb(4 191 145 / 0.2)",
        };
      case "yellow":
        return {
          bg: "rgb(190 81 3 / 0.05)",
          text: "rgb(190 81 3)",
          border: "rgb(190 81 3 / 0.2)",
        };
      case "red":
        return {
          bg: "rgb(220 38 38 / 0.05)",
          text: "rgb(220 38 38)",
          border: "rgb(220 38 38 / 0.2)",
        };
      default:
        return {
          bg: "rgb(245 245 247)",
          text: "rgb(72 72 74)",
          border: "rgb(238 238 238)",
        };
    }
  };

  // Helper function to highlight keywords in text
  const highlightKeywords = (text: string, positiveKeywords: string[], negativeKeywords: string[]) => {
    if (!text) return text;
    
    // Create a map of all keywords with their type for highlighting
    const keywordMap = new Map<string, 'positive' | 'negative'>();
    
    positiveKeywords.forEach(keyword => {
      if (keyword && keyword.trim()) {
        keywordMap.set(keyword.toLowerCase().trim(), 'positive');
      }
    });
    
    negativeKeywords.forEach(keyword => {
      if (keyword && keyword.trim()) {
        keywordMap.set(keyword.toLowerCase().trim(), 'negative');
      }
    });
    
    if (keywordMap.size === 0) return text;
    
    // Sort keywords by length (longest first) to avoid partial matches
    const sortedKeywords = Array.from(keywordMap.keys()).sort((a, b) => b.length - a.length);
    
    // Split text into segments and highlight keywords
    let result = text;
    const highlightedParts: { text: string; type?: 'positive' | 'negative' }[] = [];
    
    // Create a regex pattern that matches any of the keywords (case insensitive)
    const keywordPattern = sortedKeywords
      .map(keyword => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape regex special chars
      .join('|');
    
    if (keywordPattern) {
      const regex = new RegExp(`(${keywordPattern})`, 'gi');
      const parts = result.split(regex);
      
      return (
        <span>
          {parts.map((part, index) => {
            const lowerPart = part.toLowerCase().trim();
            const keywordType = keywordMap.get(lowerPart);
            
            if (keywordType) {
              return (
                <span
                  key={index}
                  className={
                    keywordType === 'positive'
                      ? 'bg-accent-100 text-accent-700 px-1 rounded font-medium'
                      : 'bg-destructive-100 text-destructive-700 px-1 rounded font-medium'
                  }
                >
                  {part}
                </span>
              );
            }
            
            return part;
          })}
        </span>
      );
    }
    
    return text;
  };

  const loading = loadingReports[selectedProjectId || ''] || loadingSentiment;
  const error = sentimentError;

  // Check feature access
  if (accessLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  if (!selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a project from the sidebar to view sentiment
                analysis.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb Navigation with new Report Range Selector */}
        <div className="flex items-center justify-between">
          {token && allProjects.length > 0 && (
            <BreadcrumbNav
              projects={allProjects}
              selectedProject={selectedProject}
              onProjectSelect={setSelectedProject}
              currentPage="Sentiment"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-48 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && selectedReports.length > 0 && (
          <FeatureLockedWrapper
            isLocked={isFreePlan}
            featureName="Sentiment Analysis"
            description="Unlock sentiment analysis to understand how AI models perceive your brand's emotional tone and reputation."
          >
            <div className="space-y-6 fade-in-section is-visible">
              {/* First Row: Sentiment Metrics and Trend Chart */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sentiment Metrics - 1 column */}
                <div>
                  <SentimentMetricsCard
                    averageScore={averageScore}
                    scoreVariation={scoreVariation}
                    distribution={distribution}
                    distributionVariations={distributionVariations}
                    onMetricHover={setHoveredMetric}
                    hoveredMetric={hoveredMetric}
                    isAllTime={isAllTime}
                  />
                </div>
                
                {/* Sentiment Trend Chart - Takes 2 columns */}
                <div className="md:col-span-2">
                  <SentimentTrendChart
                    data={chartData}
                    brandName={brandName}
                    hoveredMetric={hoveredMetric}
                    onMetricHover={setHoveredMetric}
                  />
                </div>
              </div>

              {/* Second Row: 3 columns with heatmap taking 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sources Analysis - 1 column */}
                <div>
                  <SourcesAnalysis
                    citations={citations}
                    type="sentiment"
                    loading={loadingSentiment}
                  />
                </div>
                
                {/* Sentiment Heatmap - Takes 2 columns */}
                <div className="md:col-span-2">
                  <SentimentHeatmap
                    reports={selectedReports}
                    selectedReport={selectedHeatmapReport}
                    onReportSelect={setSelectedHeatmapReport}
                    token={token}
                    onCellClick={handleCellClick}
                    onSentimentDataLoaded={setHeatmapSentimentData}
                  />
                </div>
              </div>

              {/* Sources Watchtower - Full width */}
              <div className="mt-6">
                <SourcesWatchtower
                  citations={citations}
                  type="sentiment"
                  loading={loadingSentiment}
                />
              </div>
            </div>
          </FeatureLockedWrapper>
        )}

        {/* No Reports State */}
        {!loading && projectReports.length === 0 && selectedProjectId && (
          <ProcessingLoader />
        )}
        
        {/* No Selected Reports - Show empty state briefly while initial selection happens */}
        {!loading && projectReports.length > 0 && selectedReports.length === 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Right Drawer for Model Analysis */}
      <div
        className={`fixed inset-0 z-50 overflow-hidden ${
          isDrawerOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${
            isDrawerOpen ? "opacity-20" : "opacity-0"
          }`}
          onClick={() => setIsDrawerOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
            isDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-mono-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-mono-900">
              {getModelFriendlyName(selectedModel || '')} Analysis
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDrawerOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Drawer Content */}
          <div className="p-6 overflow-y-auto h-[calc(100%-73px)]">
            {(() => {
              const modelData = getModelData();
              if (!modelData || !selectedStatus) return <div>No data available</div>;

              const sentimentPosition = getSentimentPositionByStatus(selectedStatus);
              const colors = getCellColor(selectedStatus);
              const sentimentLabel = selectedStatus === "green" ? "Positive" : 
                                    selectedStatus === "yellow" ? "Neutral" : 
                                    selectedStatus === "red" ? "Negative" : "Unknown";

              return (
                <div className="space-y-6">
                  {/* Model Overview */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-mono-900">
                        {getModelFriendlyName(selectedModel || '')}
                      </h4>
                      <div
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                      >
                        {sentimentLabel}
                      </div>
                    </div>

                    {/* Sentiment gauge */}
                    <div className="mb-6">
                      <div className="relative h-3 bg-mono-200 rounded-full overflow-hidden mb-2">
                        <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-destructive-500 via-primary-500 to-accent-500"></div>
                        <div
                          className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full bg-mono-900 border-2 border-white shadow-sm transition-all duration-300"
                          style={{ left: `${sentimentPosition}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-mono-400">
                        <span>Negative</span>
                        <span>Neutral</span>
                        <span>Positive</span>
                      </div>
                    </div>
                  </div>

                  {/* Question and Answer Section */}
                  {selectedQuestion && (
                    <div>
                      <div className="text-sm font-medium text-mono-700 mb-2">
                        Question:
                      </div>
                      <div className="bg-mono-50 p-4 rounded-lg border border-mono-200 mb-4">
                        <p className="text-sm text-mono-800 whitespace-pre-wrap">
                          {selectedQuestion}
                        </p>
                      </div>
                      
                      {selectedLlmResponse && (
                        <>
                          <div className="text-sm font-medium text-mono-700 mb-2">
                            Response:
                          </div>
                          <div className="bg-mono-50 p-4 rounded-lg border border-mono-200 mb-4 max-h-60 overflow-y-auto">
                            <div className="text-sm text-mono-800 whitespace-pre-wrap">
                              {highlightKeywords(
                                selectedLlmResponse,
                                modelData.positiveKeywords || [],
                                modelData.negativeKeywords || []
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Tool Usage Section */}
                  {modelData.toolUsage && modelData.toolUsage.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-mono-700 mb-2">
                        Tool Usage (Web Searches):
                      </h4>
                      <div className="space-y-2">
                        {modelData.toolUsage.map((tool: any, idx: number) => (
                          <div
                            key={idx}
                            className="text-sm bg-mono-100 p-3 rounded-md border border-mono-200"
                          >
                            <p>
                              <strong>Query:</strong>{" "}
                              {tool.parameters?.query || "N/A"}
                            </p>
                            <div>
                              <strong>Status:</strong>{" "}
                              <Badge
                                variant={
                                  tool.execution_details?.status === "success"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {tool.execution_details?.status || "N/A"}
                              </Badge>
                            </div>
                            {tool.execution_details?.result && (
                              <p className="mt-1 italic">
                                Result:{" "}
                                {String(
                                  tool.execution_details.result
                                ).substring(0, 100)}
                                ...
                              </p>
                            )}
                            {tool.execution_details?.error && (
                              <p className="mt-1 text-destructive-600">
                                Error: {tool.execution_details.error}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Citations Section */}
                  {modelData.citations && modelData.citations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-mono-700 mb-2">Citations:</h4>
                      <div className="space-y-2">
                        {modelData.citations.map((citation: any, idx: number) => (
                          <div
                            key={idx}
                            className="text-sm bg-mono-100 p-3 rounded-md border border-mono-200"
                          >
                            <p>
                              <strong>Title:</strong>{" "}
                              {citation.title || "N/A"}
                            </p>
                            <p>
                              <strong>URL:</strong>{" "}
                              <a
                                href={citation.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-secondary-600 hover:text-secondary-700 hover:underline"
                              >
                                {citation.url}
                              </a>
                            </p>
                            {citation.text && (
                              <p className="mt-1 italic">"{citation.text}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </>
  );
}