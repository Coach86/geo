"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
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

export default function SentimentPage() {
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);


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
  const handleCellClick = (model: string, sentiment: string, status: string) => {
    setSelectedModel(model);
    setSelectedStatus(status);
    setIsDrawerOpen(true);
  };

  // Get model data
  const getModelData = () => {
    if (!selectedModel || !selectedReport) return null;
    return selectedReport.modelSentiments.find(
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
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
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
        {!loading && selectedReport && (
          <div className="space-y-6 fade-in-section is-visible">
            {/* Overall Sentiment Score */}
            <SentimentOverview
              sentimentScore={selectedReport.sentimentScore || 0}
              totalResponses={selectedReport.sentimentCounts?.total || 0}
            />

            {/* Sentiment Distribution */}
            {selectedReport.sentimentCounts && (
              <SentimentDistribution
                sentimentCounts={selectedReport.sentimentCounts}
              />
            )}

            {/* Sentiment Heatmap */}
            {selectedReport.sentimentHeatmap && (
              <SentimentHeatmap
                sentimentHeatmap={selectedReport.sentimentHeatmap}
                onCellClick={handleCellClick}
              />
            )}
          </div>
        )}

        {/* No Reports State */}
        {!loading && !selectedReport && selectedProjectId && (
          <Card>
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No sentiment reports available yet. Reports are generated
                  weekly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
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
              {selectedModel} Analysis
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
                        {selectedModel}
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

                  {/* Positive Keywords */}
                  <div>
                    <div className="text-sm font-medium text-accent-700 mb-2">
                      Main positive keywords:
                    </div>
                    <div className="bg-accent-50 p-4 rounded-lg border border-accent-200">
                      {modelData.positiveKeywords &&
                      modelData.positiveKeywords.length > 0 ? (
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {modelData.positiveKeywords.map((item, i) => (
                            <li key={i} className="text-accent-700">
                              {item.trim()}
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
                      Main negative keywords:
                    </div>
                    <div className="bg-destructive-50 p-4 rounded-lg border border-destructive-200">
                      {modelData.negativeKeywords &&
                      modelData.negativeKeywords.length > 0 ? (
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {modelData.negativeKeywords.map((item, i) => (
                            <li key={i} className="text-destructive-700">
                              {item.trim()}
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
