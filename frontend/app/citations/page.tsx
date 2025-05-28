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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Globe,
  Search,
  ExternalLink,
  TrendingUp,
  Database,
  Link as LinkIcon,
  Download,
} from "lucide-react";
import {
  getCompanyReports,
  getReportCitations,
  CitationsData,
} from "@/lib/auth-api";
import type { ReportResponse } from "@/types/reports";
import type { HTMLAttributes } from "react";

interface ProcessedReport extends ReportResponse {}

export default function CitationsPage() {
  const { token } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [reports, setReports] = useState<ProcessedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ProcessedReport | null>(
    null
  );
  const [citationsData, setCitationsData] = useState<CitationsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadingCitations, setLoadingCitations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get selected company from localStorage and listen for changes
  useEffect(() => {
    const fetchReports = async () => {
      const companyId = localStorage.getItem("selectedCompanyId");

      if (!companyId || !token) {
        setSelectedCompanyId(null);
        setReports([]);
        setSelectedReport(null);
        setCitationsData(null);
        setLoading(false);
        return;
      }

      setSelectedCompanyId(companyId);
      setLoading(true);
      setError(null);

      try {
        const apiReports = await getCompanyReports(companyId, token);

        const processedReports: ProcessedReport[] = apiReports.map(
          (report: any) => ({
            id: report.id,
            companyId: report.companyId,
            reportDate: report.metadata?.date || report.generatedAt,
            createdAt: report.generatedAt,
          })
        );

        processedReports.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setReports(processedReports);
        if (processedReports.length > 0) {
          setSelectedReport(processedReports[0]);
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        setError("Failed to load reports. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();

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

  // Fetch citations when selected report changes
  useEffect(() => {
    const fetchCitations = async () => {
      if (!selectedReport || !token) {
        setCitationsData(null);
        return;
      }

      setLoadingCitations(true);
      setError(null);

      try {
        const data = await getReportCitations(selectedReport.id, token);
        setCitationsData(data);
      } catch (err) {
        console.error("Failed to fetch citations:", err);
        setError("Failed to load citations data. Please try again later.");
      } finally {
        setLoadingCitations(false);
      }
    };

    fetchCitations();
  }, [selectedReport, token]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get domain for URL display
  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  // Export citations to CSV
  const exportToCSV = () => {
    if (!citationsData || citationsData.citations.length === 0) return;

    // Prepare CSV headers
    const headers = ["Website", "Search Queries", "Link"];

    // Prepare CSV rows
    const rows = citationsData.citations.map((citation) => {
      const queries = citation.webSearchQueries.map((q) => q.query).join("; "); // Join multiple queries with semicolon

      return [
        citation.website,
        queries || "No queries",
        citation.link || "No link",
      ];
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `citations_${formatDate(
        selectedReport?.reportDate || new Date().toISOString()
      ).replace(/[, ]/g, "_")}.csv`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                  Please select a company from the sidebar to view citations
                  data.
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
              Citations Analysis
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Track sources and web access patterns used by AI models
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
            {/* First Row: Two Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Web Access Stats */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Web Access Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Responses with Web Access
                      </span>
                      <span className="text-2xl font-bold text-blue-600">
                        {citationsData.webAccess.responsesWithWebAccess}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Total Responses
                      </span>
                      <span className="text-lg font-semibold text-gray-900">
                        {citationsData.webAccess.totalResponses}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Percentage
                        </span>
                        <Badge
                          variant={
                            citationsData.webAccess.percentage >= 50
                              ? "default"
                              : "secondary"
                          }
                          className="text-lg px-3 py-1"
                        >
                          {citationsData.webAccess.percentage}%
                        </Badge>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Total Citations
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                          {citationsData.citations.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Sources */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Top 5 Sources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {citationsData.topSources.length > 0 ? (
                      citationsData.topSources.map((source, index) => (
                        <div
                          key={source.domain}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">
                              #{index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {source.domain}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {source.count} citations
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 italic">
                        No sources found
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Second Row: Full Width Citations Table */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Database className="h-5 w-5 text-purple-600" />
                      All Citations
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
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {citationsData.citations.length > 0 ? (
                  <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                    <table className="w-full min-w-[600px] border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                            Website
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                            Search Queries
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                            Link
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {citationsData.citations.map((citation, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 border-b border-gray-200">
                              <div className="flex items-center gap-2">
                                <LinkIcon className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-900">
                                  {citation.website}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200">
                              {citation.webSearchQueries.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {citation.webSearchQueries.map(
                                    (queryObj, qIndex) => (
                                      <Badge
                                        key={qIndex}
                                        variant="outline"
                                        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                      >
                                        <Search className="h-3 w-3 mr-1" />
                                        {queryObj.query}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 italic">
                                  No queries
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200">
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 italic">
                      No citations found for this report
                    </p>
                  </div>
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
                  No reports available yet. Reports are generated weekly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
