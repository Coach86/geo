"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useFeatureGate } from "@/hooks/use-feature-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { getProjectReports } from "@/lib/auth-api";
import type { ReportResponse } from "@/types/reports";
import { saveSelectedReportId, getSelectedReportId } from "@/lib/report-selection";
import { SentimentOverview } from "@/components/sentiment/SentimentOverview";
import { SentimentDistribution } from "@/components/sentiment/SentimentDistribution";
import { SentimentHeatmap } from "@/components/sentiment/SentimentHeatmap";
import { Button } from "@/components/ui/button";
import { ProjectHeader } from "@/components/project-profile/ProjectHeader";
import { ProjectMetadata } from "@/components/project-profile/ProjectMetadata";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { useNavigation } from "@/providers/navigation-provider";
import { useReportData } from "@/hooks/use-report-data";
import { ProcessingLoader } from "@/components/shared/ProcessingLoader";
import { getReportSentiment } from "@/lib/api/report";
import { getModelFriendlyName } from "@/utils/model-utils";
import { FeatureLockedWrapper } from "@/components/shared/FeatureLockedWrapper";
import { getMockSentimentData } from "@/lib/mock-data";

interface ProcessedReport extends ReportResponse {
  reportDate: string;
  createdAt: string;
  sentimentScore: number;
  sentimentCounts: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  sentimentHeatmap: {
    question: string;
    results: {
      model: string;
      sentiment: string;
      status: string;
    }[];
  }[];
  modelSentiments: {
    model: string;
    sentiment: string;
    status: string;
    positiveKeywords: string[];
    negativeKeywords: string[];
  }[];
  brandName: string;
}

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

export default function SentimentPage() {
  const { token } = useAuth();
  const { hasAccess, isLoading: accessLoading, isFreePlan } = useFeatureGate("sentiment");
  const { filteredProjects, selectedProject, setSelectedProject } = useNavigation();
  const {
    selectedProjectId,
    projectDetails,
    selectedReport,
    setSelectedReport,
    loading,
    error
  } = useReportData<ProcessedReport>((report, project) => {
    // Process API response to match our interface
    const reportData = report as any;
    // Extract tone data
    const toneData = reportData.tone || {};
    const questions = toneData.questions || [];

    // Calculate sentiment counts with error handling
    const allResults = questions.flatMap((q: any) => q.results || []);
    const sentimentCounts = allResults.length > 0 ? {
      positive: allResults.filter((r: any) => r.status === "green")
        .length,
      neutral: allResults.filter((r: any) => r.status === "yellow")
        .length,
      negative: allResults.filter((r: any) => r.status === "red")
        .length,
      total: allResults.length,
    } : {
      positive: 0,
      neutral: 0,
      negative: 0,
      total: 0,
    };

    // Extract sentiment score from KPI
    const sentimentScore = parseInt(reportData.kpi?.tone?.value || "0");

    // Extract brand name
    const brandName =
      reportData.brand || (report.metadata as any)?.brand || project.brandName;

    // Extract model sentiments
    const modelSentiments = toneData.sentiments || [];

    return {
      ...report,
      reportDate: report.metadata?.date || report.generatedAt,
      createdAt: report.generatedAt,
      sentimentScore,
      sentimentCounts,
      sentimentHeatmap: questions,
      modelSentiments,
      brandName,
    };
  });
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [selectedLlmResponse, setSelectedLlmResponse] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [sentimentError, setSentimentError] = useState<string | null>(null);

  // Fetch sentiment data when selected report changes
  useEffect(() => {
    const fetchSentimentData = async () => {
      if (!selectedReport || !token) {
        setSentimentData(null);
        return;
      }

      setLoadingSentiment(true);
      setSentimentError(null);

      try {
        if (isFreePlan) {
          // Use mock data for free plan users
          const mockData = getMockSentimentData();
          const sentimentData: SentimentData = {
            overallScore: mockData.overallSentiment.positive,
            overallSentiment: mockData.overallSentiment.positive >= 60 ? 'positive' : 
                            mockData.overallSentiment.negative >= 40 ? 'negative' : 'neutral',
            distribution: {
              positive: mockData.overallSentiment.positive,
              neutral: mockData.overallSentiment.neutral,
              negative: mockData.overallSentiment.negative,
              total: 100
            },
            modelSentiments: mockData.sentimentByModel.map(m => ({
              model: m.model,
              sentiment: m.positive >= 60 ? 'positive' : m.negative >= 40 ? 'negative' : 'neutral',
              status: m.positive >= 60 ? 'green' : m.negative >= 40 ? 'red' : 'yellow',
              positiveKeywords: ['innovative', 'reliable', 'quality'],
              negativeKeywords: ['expensive', 'complex']
            })),
            heatmapData: mockData.keyThemes.map(theme => ({
              question: `How is ${theme.theme} perceived?`,
              results: mockData.sentimentByModel.map(m => ({
                model: m.model,
                sentiment: theme.sentiment as 'positive' | 'neutral' | 'negative',
                status: theme.sentiment === 'positive' ? 'green' : theme.sentiment === 'negative' ? 'red' : 'yellow',
                llmResponse: m.details
              }))
            }))
          };
          setSentimentData(sentimentData);
        } else {
          const data = await getReportSentiment(selectedReport.id, token);
          setSentimentData(data);
        }
      } catch (err) {
        console.error("Failed to fetch sentiment data:", err);
        setSentimentError("Failed to load sentiment data. Please try again later.");
      } finally {
        setLoadingSentiment(false);
      }
    };

    fetchSentimentData();
  }, [selectedReport, token, isFreePlan]);


  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Handle cell click from heatmap
  const handleCellClick = (model: string, sentiment: string, status: string, question: string, llmResponse?: string) => {
    setSelectedModel(model);
    setSelectedStatus(status);
    setSelectedQuestion(question);
    setSelectedLlmResponse(llmResponse || null);
    setIsDrawerOpen(true);
  };

  // Get model data
  const getModelData = () => {
    if (!selectedModel || !sentimentData) return null;
    return sentimentData.modelSentiments.find(
      (s) => s.model === selectedModel
    );
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
        {/* Breadcrumb Navigation */}
        {token && filteredProjects.length > 0 && (
          <BreadcrumbNav
            projects={filteredProjects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
            currentPage="Sentiment"
            showReportSelector={true}
            token={token}
            onReportSelect={setSelectedReport}
          />
        )}


        {/* Error State */}
        {(error || sentimentError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || sentimentError}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {(loading || loadingSentiment) && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Report Content */}
        {!loading && !loadingSentiment && selectedReport && sentimentData && (
          <FeatureLockedWrapper
            isLocked={isFreePlan}
            featureName="Sentiment Analysis"
            description="Unlock sentiment analysis to understand how AI models perceive your brand's emotional tone and reputation."
          >
            <div className="space-y-6 fade-in-section is-visible">
              {/* Overall Sentiment Score */}
              <SentimentOverview
                sentimentScore={sentimentData.overallScore}
                totalResponses={sentimentData.distribution.total}
              />

              {/* Sentiment Distribution */}
              <SentimentDistribution
                sentimentCounts={sentimentData.distribution}
              />

              {/* Sentiment Heatmap */}
              <SentimentHeatmap
                sentimentHeatmap={sentimentData.heatmapData}
                onCellClick={handleCellClick}
              />
            </div>
          </FeatureLockedWrapper>
        )}

        {/* No Reports State */}
        {!loading && !selectedReport && selectedProjectId && (
          <ProcessingLoader />
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

                  {/* Positive Keywords */}
                  <div>
                    <div className="text-sm font-medium text-accent-700 mb-2">
                      Main positive keywords (across all responses of {getModelFriendlyName(selectedModel || '')}):
                    </div>
                    <div className="bg-accent-50 p-4 rounded-lg border border-accent-200">
                      {modelData.positiveKeywords &&
                      modelData.positiveKeywords.length > 0 ? (
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {modelData.positiveKeywords.map((item, i) => (
                            <li key={i} className="text-accent-700">
                              {item.trim().charAt(0).toUpperCase() + item.trim().slice(1)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm italic text-accent-600">
                          No positive keywords found
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Negative Keywords */}
                  <div>
                    <div className="text-sm font-medium text-destructive-700 mb-2">
                      Main negative keywords (across all responses of {getModelFriendlyName(selectedModel || '')}):
                    </div>
                    <div className="bg-destructive-50 p-4 rounded-lg border border-destructive-200">
                      {modelData.negativeKeywords &&
                      modelData.negativeKeywords.length > 0 ? (
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {modelData.negativeKeywords.map((item, i) => (
                            <li key={i} className="text-destructive-700">
                              {item.trim().charAt(0).toUpperCase() + item.trim().slice(1)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm italic text-destructive-600">
                          No negative keywords found
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </>
  );
}
