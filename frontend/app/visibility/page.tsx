"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, Eye, Zap, Target, Brain } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getCompanyReports, ReportContentResponse } from "@/lib/auth-api";
import { ModelIcon } from "@/components/ui/model-icon";

interface ProcessedReport {
  id: string;
  companyId: string;
  reportDate: string;
  createdAt: string;
  mentionRate: number;
  modeMetrics: {
    model: string;
    mentionRate: number;
  }[];
  arenaMetrics: {
    model: string;
    mentions: number;
    score: number;
    rank: number;
  }[];
  arenaData: any[]; // Full arena data for table
}

export default function VisibilityPage() {
  const { token } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [reports, setReports] = useState<ProcessedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ProcessedReport | null>(null);
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
        const processedReports: ProcessedReport[] = apiReports.map((report: any) => {
          // Extract model metrics from pulse.modelVisibility
          const modeMetrics = report.pulse?.modelVisibility?.map((mv: any) => ({
            model: mv.model,
            mentionRate: mv.value || 0,
          })) || [];

          // Store the complete arena data for the table view
          const arenaData = report.arena?.competitors || [];

          // For the simplified arenaMetrics (used in the original design),
          // we'll just store the brand's performance if it exists
          const arenaMetrics: any[] = [];
          const brandName = report.brand || report.metadata?.brand || "Manpower France";
          const brandInArena = arenaData.find((comp: any) =>
            comp.name.toLowerCase() === brandName.toLowerCase()
          );

          if (brandInArena?.modelsMentionsRate) {
            brandInArena.modelsMentionsRate.forEach((mmr: any, index: number) => {
              arenaMetrics.push({
                model: mmr.model,
                mentions: mmr.mentionsRate,
                score: mmr.mentionsRate / 10,
                rank: index + 1,
              });
            });
          }

          return {
            id: report.id,
            companyId: report.companyId,
            reportDate: report.metadata?.date || report.generatedAt,
            createdAt: report.generatedAt,
            mentionRate: parseInt(report.kpi?.pulse?.value || report.pulse?.value || "0"),
            modeMetrics,
            arenaMetrics,
            arenaData, // Full arena data for table
          };
        });

        // Sort reports by date (most recent first)
        processedReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setReports(processedReports);
        if (processedReports.length > 0) {
          setSelectedReport(processedReports[0]); // Select the most recent report by default
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        setError("Failed to load visibility reports. Please try again later.");
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
      window.removeEventListener("companySelectionChanged", handleCompanyChange);
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

  // Get color based on mention rate
  const getMentionRateColor = (rate: number) => {
    if (rate >= 80) return "text-accent-600";
    if (rate >= 60) return "text-primary-600";
    if (rate >= 40) return "text-secondary-600";
    return "text-destructive-600";
  };

  // Get model badge color
  const getModelColor = (model: string) => {
    const colors: Record<string, string> = {
      "ChatGPT": "bg-accent-100 text-accent-800 border-accent-200",
      "OpenAI": "bg-accent-100 text-accent-800 border-accent-200",
      "Claude 3": "bg-secondary-100 text-secondary-800 border-secondary-200",
      "Claude": "bg-secondary-100 text-secondary-800 border-secondary-200",
      "Anthropic": "bg-secondary-100 text-secondary-800 border-secondary-200",
      "Gemini 1.5 Pro": "bg-primary-100 text-primary-800 border-primary-200",
      "Gemini": "bg-primary-100 text-primary-800 border-primary-200",
      "Google": "bg-primary-100 text-primary-800 border-primary-200",
      "Perplexity": "bg-dark-100 text-dark-800 border-dark-200",
      "Llama": "bg-secondary-200 text-secondary-700 border-secondary-300",
    };
    return colors[model] || "bg-dark-50 text-dark-700 border-dark-100";
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
                  Please select a company from the sidebar to view visibility metrics.
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
            <h1 className="text-2xl font-bold text-gray-900">Visibility Analytics</h1>
            <p className="text-sm text-gray-600 mt-1">
              Track how often your brand is mentioned across AI models
            </p>
          </div>

          {/* Report Selector */}
          <Select
            value={selectedReport?.id}
            onValueChange={(value) => {
              const report = reports.find(r => r.id === value);
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Report Content */}
        {!loading && selectedReport && (
          <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Global Mention Rate */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-dark-700 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary-600" />
                    Overall Mention Rate
                  </CardTitle>
                  <Badge variant="outline" className="text-sm">
                    Across all models
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Brand Visibility Score</span>
                    <span className="text-3xl font-bold text-secondary-600">
                      {selectedReport.mentionRate || 0}%
                    </span>
                  </div>
                  <Progress
                    value={selectedReport.mentionRate || 0}
                    className="h-3"
                  />
                  <p className="text-sm text-gray-500">
                    Your brand was mentioned in {selectedReport.mentionRate || 0}% of relevant conversations
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Mention Rate by Model and Top Mentions Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By Model Mention Rate */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-dark-700 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-secondary-600" />
                    Mention Rate by Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedReport.modeMetrics?.map((metric, index) => (
                      <div
                        key={metric.model}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`${getModelColor(metric.model)} font-medium flex items-center gap-1`}
                          >
                            <ModelIcon model={metric.model} size="xs" />
                            {metric.model}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <Progress
                            value={metric.mentionRate}
                            className="w-24 h-2"
                          />
                          <span className="font-semibold text-secondary-600">
                            {metric.mentionRate}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Mentions Section */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-dark-700 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-accent-600" />
                    Top Mentions
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Brands most frequently mentioned across AI responses
                  </p>
                </CardHeader>
                <CardContent>
                  {selectedReport.arenaData && selectedReport.arenaData.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedReport.arenaData
                          .sort((a: any, b: any) => parseFloat(b.global.replace('%', '')) - parseFloat(a.global.replace('%', '')))
                          .map((competitor: any, index: number) => {
                            const isTopThree = index < 3;

                            return (
                              <Badge
                                key={index}
                                variant={isTopThree ? "default" : "outline"}
                                className={`
                                  ${isTopThree
                                    ? index === 0
                                      ? "bg-accent-100 text-accent-800 border-accent-200"
                                      : index === 1
                                        ? "bg-primary-100 text-primary-800 border-primary-200"
                                        : "bg-secondary-100 text-secondary-800 border-secondary-200"
                                    : "border-dark-200 text-dark-700"
                                  }
                                  text-sm font-medium px-3 py-1 animate-in slide-in-from-bottom-5
                                `}
                                style={{ animationDelay: `${index * 100}ms` }}
                              >
                                {competitor.name} ({competitor.global})
                                {index === 0 && (
                                  <span className="ml-1 text-xs">👑</span>
                                )}
                              </Badge>
                            );
                          })}
                      </div>

                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">
                          <strong>Top performer:</strong> {
                            [...selectedReport.arenaData]
                              .sort((a: any, b: any) => parseFloat(b.global.replace('%', '')) - parseFloat(a.global.replace('%', '')))[0]?.name
                          } leads with {
                            [...selectedReport.arenaData]
                              .sort((a: any, b: any) => parseFloat(b.global.replace('%', '')) - parseFloat(a.global.replace('%', '')))[0]?.global
                          } visibility across all models.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No mention data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Arena Section */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-dark-700 flex items-center gap-2">
                  <Target className="h-5 w-5 text-secondary-600" />
                  Competitive Visibility
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Brand visibility comparison across AI models
                </p>
              </CardHeader>
              <CardContent>
                {selectedReport.arenaData && selectedReport.arenaData.length > 0 ? (
                  <div className="space-y-6">
                    {/* Top competitor info */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {[...selectedReport.arenaData]
                            .sort((a, b) => parseFloat(b.global.replace('%', '')) - parseFloat(a.global.replace('%', '')))[0]?.name || "N/A"}
                        </h3>
                        <p className="text-sm text-gray-600">
                          with {[...selectedReport.arenaData]
                            .sort((a, b) => parseFloat(b.global.replace('%', '')) - parseFloat(a.global.replace('%', '')))[0]?.global || "N/A"} visibility
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          Competitors Analyzed
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {selectedReport.arenaData.length}
                        </div>
                      </div>
                    </div>

                    {/* Competitors table */}
                    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                      <table className="w-full min-w-[500px] border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                              Brand
                            </th>
                            {selectedReport.arenaData[0]?.modelsMentionsRate?.map((model: any, index: number) => (
                              <th key={index} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                                {model.model}
                              </th>
                            ))}
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                              Global %
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...selectedReport.arenaData]
                            .sort((a, b) => parseFloat(b.global.replace('%', '')) - parseFloat(a.global.replace('%', '')))
                            .map((competitor: any, index: number) => {
                              const colors = [
                                "#553C9A", "#6B46C1", "#805AD5", "#9F7AEA",
                                "#B794F4", "#D6BCFA", "#E9D8FD"
                              ];
                              const color = colors[index % colors.length];

                              return (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 border-b border-gray-200">
                                    <div className="flex items-center">
                                      <div
                                        className="w-3 h-3 rounded-full mr-2"
                                        style={{ backgroundColor: color }}
                                      />
                                      <span className="font-medium">
                                        {competitor.name}
                                      </span>
                                    </div>
                                  </td>
                                  {competitor.modelsMentionsRate?.map((model: any, modelIndex: number) => (
                                    <td key={modelIndex} className="px-4 py-3 text-center border-b border-gray-200">
                                      {model.mentionsRate}%
                                    </td>
                                  ))}
                                  <td className="px-4 py-3 text-center border-b border-gray-200 font-bold">
                                    {competitor.global}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No competitive data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Reports State */}
        {!loading && reports.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No visibility reports available yet. Reports are generated weekly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
