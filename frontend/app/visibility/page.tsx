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
import {
  getCompanyReports,
  getReportSpontaneous,
  SpontaneousData,
} from "@/lib/auth-api";
import { VisibilityAnalysis } from "@/components/visibility/VisibilityAnalysis";
import { TopMentions } from "@/components/visibility/TopMentions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
  brandName: string;
  topMentions: {
    mention: string;
    count: number;
  }[];
  spontaneousData?: SpontaneousData; // Store the full spontaneous data if available
}

export default function VisibilityPage() {
  const { token } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [reports, setReports] = useState<ProcessedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ProcessedReport | null>(
    null
  );
  const [spontaneousData, setSpontaneousData] =
    useState<SpontaneousData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSpontaneous, setLoadingSpontaneous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);

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
            // Extract model metrics from pulse.modelVisibility
            const modeMetrics =
              report.pulse?.modelVisibility?.map((mv: any) => ({
                model: mv.model,
                mentionRate: mv.value || 0,
              })) || [];

            // Store the complete arena data for the table view
            const arenaData = report.arena?.competitors || [];

            // Extract brand name
            const brandName =
              report.brand || report.metadata?.brand || "Your Brand";

            // For the simplified arenaMetrics (used in the original design),
            // we'll just store the brand's performance if it exists
            const arenaMetrics: any[] = [];
            const brandInArena = arenaData.find(
              (comp: any) => comp.name.toLowerCase() === brandName.toLowerCase()
            );

            if (brandInArena?.modelsMentionsRate) {
              brandInArena.modelsMentionsRate.forEach(
                (mmr: any, index: number) => {
                  arenaMetrics.push({
                    model: mmr.model,
                    mentions: mmr.mentionsRate,
                    score: mmr.mentionsRate / 10,
                    rank: index + 1,
                  });
                }
              );
            }

            // We'll fetch spontaneous data separately, so just set empty array for now
            const topMentions: { mention: string; count: number }[] = [];

            return {
              id: report.id,
              companyId: report.companyId,
              reportDate: report.metadata?.date || report.generatedAt,
              createdAt: report.generatedAt,
              mentionRate: parseInt(
                report.kpi?.pulse?.value || report.pulse?.value || "0"
              ),
              modeMetrics,
              arenaMetrics,
              arenaData, // Full arena data for table
              brandName,
              topMentions,
              spontaneousData: report.spontaneous,
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
      window.removeEventListener(
        "companySelectionChanged",
        handleCompanyChange
      );
    };
  }, [token]);

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
                  Please select a company from the sidebar to view visibility
                  metrics.
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
              Visibility Analytics
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Track how often your brand is mentioned across AI models
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
          <div className="space-y-6 fade-in-section is-visible">
            {/* Competitor Selection */}
            {selectedReport.arenaData && selectedReport.arenaData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-dark-700">
                    Select Competitors to Compare
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose which competitors to display in the analysis
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {selectedReport.arenaData
                      .filter(
                        (comp) =>
                          comp.name.toLowerCase() !==
                          selectedReport.brandName.toLowerCase()
                      )
                      .map((competitor) => (
                        <div
                          key={competitor.name}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={competitor.name}
                            checked={selectedCompetitors.includes(
                              competitor.name
                            )}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCompetitors((prev) => [
                                  ...prev,
                                  competitor.name,
                                ]);
                              } else {
                                setSelectedCompetitors((prev) =>
                                  prev.filter((c) => c !== competitor.name)
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={competitor.name}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {competitor.name}
                          </Label>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <VisibilityAnalysis
              mentionRate={selectedReport.mentionRate}
              modeMetrics={selectedReport.modeMetrics}
              arenaData={selectedReport.arenaData}
              brandName={selectedReport.brandName}
              selectedCompetitors={selectedCompetitors}
            />

            <TopMentions
              spontaneousData={spontaneousData}
              loadingSpontaneous={loadingSpontaneous}
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
                  No visibility reports available yet. Reports are generated
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
