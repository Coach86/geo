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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  getCompanyReports,
  getCompanyById,
  ReportContentResponse,
} from "@/lib/auth-api";
import type { BrandBattleData } from "@/types/brand-battle";

interface ProcessedReport {
  id: string;
  companyId: string;
  reportDate: string;
  createdAt: string;
  brandName: string;
  competitors: string[];
  brandBattle?: BrandBattleData;
}

export default function BattlePage() {
  const { token } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [reports, setReports] = useState<ProcessedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ProcessedReport | null>(
    null
  );
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
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
        // Fetch company details to get competitors
        const companyDetails = await getCompanyById(companyId, token);
        const competitors = companyDetails.competitors || [];

        // Fetch reports from API
        const apiReports = await getCompanyReports(companyId, token);

        // Process API response to match our interface
        const processedReports: ProcessedReport[] = apiReports.map(
          (report: ReportContentResponse) => {
            return {
              id: report.id,
              companyId: report.companyId,
              reportDate: report.generatedAt,
              createdAt: report.generatedAt,
              brandName:
                report.brand?.name || companyDetails.brandName || "Your Brand",
              competitors: competitors,
              brandBattle: (report as any).brandBattle,
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
          setSelectedCompetitors(competitors);
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        setError("Failed to load battle reports. Please try again later.");
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

  // Filter brand battle data based on selected competitors
  const getFilteredBattleData = (): BrandBattleData | null => {
    if (!selectedReport?.brandBattle || selectedCompetitors.length === 0)
      return null;

    return {
      ...selectedReport.brandBattle,
      competitorAnalyses: selectedReport.brandBattle.competitorAnalyses.filter(
        (analysis) => selectedCompetitors.includes(analysis.competitor)
      ),
    };
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
                  Please select a company from the sidebar to view brand battle
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
              Brand Battle Analysis
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Compare your brand's strengths and weaknesses against competitors
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
          </div>
        )}

        {/* Report Content */}
        {!loading && selectedReport && (
          <div className="space-y-6">
            {/* Competitor Selection */}
            {selectedReport.competitors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-dark-700">
                    Select Competitors to Analyze
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose which competitors to include in the brand battle
                    analysis
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {selectedReport.competitors.map((competitor) => (
                      <div
                        key={competitor}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={competitor}
                          checked={selectedCompetitors.includes(competitor)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCompetitors((prev) => [
                                ...prev,
                                competitor,
                              ]);
                            } else {
                              setSelectedCompetitors((prev) =>
                                prev.filter((c) => c !== competitor)
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={competitor}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {competitor}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Brand Battle Table */}
            {getFilteredBattleData() &&
            getFilteredBattleData()!.competitorAnalyses.length > 0 ? (
              <BrandBattleTable
                brand={selectedReport.brandName}
                data={getFilteredBattleData()!}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {selectedCompetitors.length === 0
                        ? "Please select at least one competitor to view the analysis."
                        : "No brand battle data available for this report."}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* No Reports State */}
        {!loading && reports.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No battle reports available yet. Reports are generated weekly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// Brand Battle Table Component
function BrandBattleTable({
  brand,
  data,
}: {
  brand: string;
  data: BrandBattleData;
}) {
  // Get unique list of models across all competitor analyses
  const models = Array.from(
    new Set(
      data.competitorAnalyses.flatMap((comp) =>
        comp.analysisByModel.map((c) => c.model)
      )
    )
  );

  // count the number of strengths and weaknesses across all competitors
  const strengths = data.competitorAnalyses.flatMap((comp) =>
    comp.analysisByModel.flatMap((c) => c.strengths)
  );
  const weaknesses = data.competitorAnalyses.flatMap((comp) =>
    comp.analysisByModel.flatMap((c) => c.weaknesses)
  );
  const totalStrengthsAndWeaknesses = strengths.length + weaknesses.length;

  return (
    <div className="mb-16 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-900">
          Brand Battle vs Pre‑selected Competitors
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          "Can you tell me the strengths and weaknesses of {brand} vs.
          competitor?"
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {data.competitorAnalyses.map((competitor, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
            >
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-base font-bold text-gray-800">
                  {brand} vs{" "}
                  <span className="text-[#805AD5]">
                    {competitor.competitor}
                  </span>
                </h3>
              </div>

              <div className="p-3">
                <div>
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 border-b-2 border-gray-200 w-[40px]"></th>
                        {models.map((model, mIndex) => {
                          return (
                            <th
                              key={mIndex}
                              className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-200"
                            >
                              {model}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Strengths row */}
                      <tr className="bg-[#E3F2FD]">
                        <td className="px-2 py-2 border-b border-gray-200 font-bold text-[#0D47A1] text-sm text-center">
                          <div
                            className="flex items-center justify-center"
                            title="Strengths"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </td>
                        {models.map((model, mIndex) => {
                          const analysis = competitor.analysisByModel.find(
                            (a) => a.model === model
                          );
                          return (
                            <td
                              key={mIndex}
                              className="px-2 py-2 border-b border-gray-200 text-xs"
                            >
                              {analysis?.strengths.map((strength, sIndex) => (
                                <div
                                  key={sIndex}
                                  className="mb-1 flex items-start"
                                >
                                  <span className="text-[#2196F3] mr-1 mt-0.5 flex-shrink-0">
                                    •
                                  </span>
                                  <span className="text-gray-800">
                                    {strength}
                                  </span>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                      {/* Weaknesses row */}
                      <tr className="bg-[#FCE4EC]">
                        <td className="px-2 py-2 font-bold text-[#AD1457] text-sm text-center">
                          <div
                            className="flex items-center justify-center"
                            title="Weaknesses"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </td>
                        {models.map((model, mIndex) => {
                          const analysis = competitor.analysisByModel.find(
                            (a) => a.model === model
                          );
                          return (
                            <td key={mIndex} className="px-2 py-2 text-xs">
                              {analysis?.weaknesses.map((weakness, wIndex) => (
                                <div
                                  key={wIndex}
                                  className="mb-1 flex items-start"
                                >
                                  <span className="text-[#C2185B] mr-1 mt-0.5 flex-shrink-0">
                                    •
                                  </span>
                                  <span className="text-gray-800">
                                    {weakness}
                                  </span>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Common strengths and weaknesses section */}
        {(data.commonStrengths.length > 0 ||
          data.commonWeaknesses.length > 0) && (
          <div className="mt-8 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-800">
                Common Patterns Across Competitors
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.commonStrengths.length > 0 && (
                <div className="bg-[#E3F2FD] p-3 rounded-lg">
                  <h4 className="font-semibold text-[#0D47A1] mb-2">
                    Common Strengths
                  </h4>
                  <ul className="space-y-1">
                    {data.commonStrengths.map((strength, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-[#2196F3] mr-1 mt-0.5 flex-shrink-0">
                          •
                        </span>
                        <span className="text-gray-800">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.commonWeaknesses.length > 0 && (
                <div className="bg-[#FCE4EC] p-3 rounded-lg">
                  <h4 className="font-semibold text-[#AD1457] mb-2">
                    Common Weaknesses
                  </h4>
                  <ul className="space-y-1">
                    {data.commonWeaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-[#C2185B] mr-1 mt-0.5 flex-shrink-0">
                          •
                        </span>
                        <span className="text-gray-800">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
