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
import { AlertCircle } from "lucide-react";
import { getCompanyReports } from "@/lib/auth-api";
import { SentimentOverview } from "@/components/sentiment/SentimentOverview";
import { SentimentDistribution } from "@/components/sentiment/SentimentDistribution";
import { SentimentHeatmap } from "@/components/sentiment/SentimentHeatmap";

interface ProcessedReport {
  id: string;
  companyId: string;
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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [reports, setReports] = useState<ProcessedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ProcessedReport | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    </DashboardLayout>
  );
}
