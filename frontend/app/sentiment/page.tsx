"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
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
import { getCompanyReports } from "@/lib/auth-api";
import type { ReportResponse } from "@/types/reports";
import { SentimentOverview } from "@/components/sentiment/SentimentOverview";
import { SentimentDistribution } from "@/components/sentiment/SentimentDistribution";
import { SentimentHeatmap } from "@/components/sentiment/SentimentHeatmap";
import { Button } from "@/components/ui/button";

interface ProcessedReport extends ReportResponse {
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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [reports, setReports] = useState<ProcessedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ProcessedReport | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Get selected company from localStorage and listen for changes
  useEffect(() => {
    const fetchReports = async () => {
      const companyId = localStorage.getItem("selectedCompanyId");

      if (!companyId || !token) {
        setSelectedCompanyId(null);
        setReports([]);
        setSelectedReport(null);
        setLoading(false);
        return;
      }

      setSelectedCompanyId(companyId);
      setLoading(true);
      setError(null);

      try {
        // Fetch reports from API
        const apiReports = await getCompanyReports(companyId, token);

        // Process API response to match our interface
        const processedReports: ProcessedReport[] = apiReports.map(
          (report: any) => {
            // Extract tone data
            const toneData = report.tone || {};
            const questions = toneData.questions || [];

            // Calculate sentiment counts
            const allResults = questions.flatMap((q: any) => q.results || []);
            const sentimentCounts = {
              positive: allResults.filter((r: any) => r.status === "green")
                .length,
              neutral: allResults.filter((r: any) => r.status === "yellow")
                .length,
              negative: allResults.filter((r: any) => r.status === "red")
                .length,
              total: allResults.length,
            };

            // Extract sentiment score from KPI
            const sentimentScore = parseInt(report.kpi?.tone?.value || "0");

            // Extract brand name
            const brandName =
              report.brand || report.metadata?.brand || "Your Brand";

            // Extract model sentiments
            const modelSentiments = toneData.sentiments || [];

            return {
              id: report.id,
              companyId: report.companyId,
              reportDate: report.metadata?.date || report.generatedAt,
              createdAt: report.generatedAt,
              sentimentScore,
              sentimentCounts,
              sentimentHeatmap: questions,
              modelSentiments,
              brandName,
            };
          }
        );

        // Sort reports by date (most recent first)
        processedReports.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setReports(processedReports);
        if (processedReports.length > 0) {
          setSelectedReport(processedReports[0]); // Select the most recent report by default
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        setError("Failed to load sentiment reports. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();

    // Listen for company selection changes (same-tab updates)
    const handleCompanyChange = () => {
      fetchReports();
    };

    window.addEventListener("companySelectionChanged", handleCompanyChange);

    return () => {
      window.removeEventListener(
        "companySelectionChanged",
        handleCompanyChange
      );
    };
  }, [token]);

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
  const handleCellClick = (model: string) => {
    setSelectedModel(model);
    setIsDrawerOpen(true);
  };

  // Get model data
  const getModelData = () => {
    if (!selectedModel || !selectedReport) return null;
    return selectedReport.modelSentiments.find(
      (s) => s.model === selectedModel
    );
  };

  // Helper functions from tone-section
  const getSentimentValue = (sentiment: string) => {
    return Number.parseFloat(sentiment);
  };

  const getSentimentPosition = (sentiment: string) => {
    const value = getSentimentValue(sentiment);
    return ((value + 1) / 2) * 100 - 1;
  };

  const getSentimentPercentage = (sentiment: string) => {
    return Math.round(getSentimentValue(sentiment) * 100);
  };

  const getCellColor = (status: string) => {
    switch (status) {
      case "green":
        return {
          bg: "#E3F2FD",
          text: "#0D47A1",
          border: "#90CAF9",
        };
      case "yellow":
        return {
          bg: "#EDE7F6",
          text: "#4527A0",
          border: "#B39DDB",
        };
      case "red":
        return {
          bg: "#FCE4EC",
          text: "#AD1457",
          border: "#F48FB1",
        };
      default:
        return {
          bg: "#F5F5F5",
          text: "#616161",
          border: "#E0E0E0",
        };
    }
  };

  if (!selectedCompanyId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a company from the sidebar to view sentiment
                  analysis.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header with Report Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sentiment Analysis
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Analyze how AI models perceive your brand's sentiment
            </p>
          </div>

          {/* Report Selector */}
          <Select
            value={selectedReport?.id}
            onValueChange={(value) => {
              const report = reports.find((r) => r.id === value);
              setSelectedReport(report || null);
            }}
            disabled={loading || reports.length === 0}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a report" />
            </SelectTrigger>
            <SelectContent>
              {reports.map((report) => (
                <SelectItem key={report.id} value={report.id}>
                  {formatDate(report.reportDate)}
                  {report === reports[0] && (
                    <span className="ml-2 text-xs text-gray-500">(Latest)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              sentimentScore={selectedReport.sentimentScore}
              totalResponses={selectedReport.sentimentCounts.total}
            />

            {/* Sentiment Distribution */}
            <SentimentDistribution
              sentimentCounts={selectedReport.sentimentCounts}
            />

            {/* Sentiment Heatmap */}
            <SentimentHeatmap
              sentimentHeatmap={selectedReport.sentimentHeatmap}
              onCellClick={handleCellClick}
            />
          </div>
        )}

        {/* No Reports State */}
        {!loading && reports.length === 0 && (
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
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
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
              if (!modelData) return <div>No data available</div>;

              const sentimentPosition = getSentimentPosition(
                modelData.sentiment
              );
              const sentimentPercentage = getSentimentPercentage(
                modelData.sentiment
              );
              const colors = getCellColor(modelData.status);

              return (
                <div className="space-y-6">
                  {/* Model Overview */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-800">
                        {selectedModel}
                      </h4>
                      <div
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                      >
                        {sentimentPercentage}%
                      </div>
                    </div>

                    {/* Sentiment gauge */}
                    <div className="mb-6">
                      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                        <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-[#C2185B] via-[#673AB7] to-[#2196F3]"></div>
                        <div
                          className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full bg-black border-2 border-white shadow-sm"
                          style={{ left: `${sentimentPosition}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Negative</span>
                        <span>Neutral</span>
                        <span>Positive</span>
                      </div>
                    </div>
                  </div>

                  {/* Positive Keywords */}
                  <div>
                    <div className="text-sm font-medium text-[#0D47A1] mb-2">
                      Main positive keywords:
                    </div>
                    <div className="bg-[#E3F2FD] p-4 rounded-lg border border-[#90CAF9]">
                      {modelData.positiveKeywords &&
                      modelData.positiveKeywords.length > 0 ? (
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {modelData.positiveKeywords.map((item, i) => (
                            <li key={i} className="text-[#0D47A1]">
                              {item.trim()}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm italic text-[#0D47A1]">
                          No positive keywords found
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Negative Keywords */}
                  <div>
                    <div className="text-sm font-medium text-[#AD1457] mb-2">
                      Main negative keywords:
                    </div>
                    <div className="bg-[#FCE4EC] p-4 rounded-lg border border-[#F48FB1]">
                      {modelData.negativeKeywords &&
                      modelData.negativeKeywords.length > 0 ? (
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {modelData.negativeKeywords.map((item, i) => (
                            <li key={i} className="text-[#AD1457]">
                              {item.trim()}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm italic text-[#AD1457]">
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
    </DashboardLayout>
  );
}
