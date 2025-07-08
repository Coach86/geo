"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useFeatureGate } from "@/hooks/use-feature-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/persistent-tooltip";
import { ModelDisplay } from "@/components/shared/ModelDisplay";
import type { CompetitionData as CompetitionTypeData } from "@/types/competition";
import { useNavigation } from "@/providers/navigation-provider";
import { ProcessingLoader } from "@/components/shared/ProcessingLoader";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { FeatureLockedWrapper } from "@/components/shared/FeatureLockedWrapper";
import { getReportCompetition } from "@/lib/api/report";
import { useReportData } from "@/hooks/use-report-data";
import { CompetitionWatchtower } from "@/components/competition/CompetitionWatchtower";
import { useReports } from "@/providers/report-provider";
import { SingleReportSelector } from "@/components/shared/SingleReportSelector";
import type { ReportResponse } from "@/types/reports";
import { PageTransition } from "@/components/shared/PageTransition";

interface ProcessedReport extends ReportResponse {
  brandName: string;
  competitors: string[];
}

export default function CompetitionPage() {
  const { token } = useAuth();
  const { hasAccess, isLoading: accessLoading, isFreePlan } = useFeatureGate("competition");
  const { allProjects, selectedProject, setSelectedProject } = useNavigation();
  const { reports, loadingReports, fetchReports, selectReport } = useReports();
  
  const selectedProjectId = selectedProject?.id || null;
  const projectReports = selectedProjectId ? reports[selectedProjectId] || [] : [];
  const brandName = selectedProject?.brandName || 'Brand';
  
  // Use report data hook for report selection
  const {
    selectedReport,
    setSelectedReport,
    loading: reportLoading,
    error: reportError
  } = useReportData<ProcessedReport>((report, project) => {
    return {
      ...report,
      brandName: project.brandName,
      competitors: project.competitors || [],
    };
  });
  
  // State for competition data
  const [competitionData, setCompetitionData] = useState<any>(null);
  const [loadingCompetition, setLoadingCompetition] = useState(false);
  const [competitionError, setCompetitionError] = useState<string | null>(null);
  
  // State for model filtering
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Fetch reports when project changes
  useEffect(() => {
    if (selectedProjectId && token) {
      fetchReports(selectedProjectId, token);
    }
  }, [selectedProjectId, token, fetchReports]);

  // Fetch competition data when selected report changes
  useEffect(() => {
    const fetchCompetitionData = async () => {
      if (!selectedReport || !token) {
        setCompetitionData(null);
        return;
      }

      setLoadingCompetition(true);
      setCompetitionError(null);

      try {
        const data = await getReportCompetition(selectedReport.id, token);
        setCompetitionData(data);
        
        // Extract available models from the competition data
        if (data?.competitorAnalyses) {
          const models = new Set<string>();
          data.competitorAnalyses.forEach((comp: any) => {
            comp.analysisByModel?.forEach((analysis: any) => {
              models.add(analysis.model);
            });
          });
          const modelArray = Array.from(models);
          setAvailableModels(modelArray);
          setSelectedModels(modelArray); // Select all by default
        }
      } catch (err) {
        console.error("Failed to fetch competition data:", err);
        setCompetitionError("Failed to load competition data. Please try again later.");
      } finally {
        setLoadingCompetition(false);
      }
    };

    fetchCompetitionData();
  }, [selectedReport, token]);

  // Handle report change
  const handleReportChange = useCallback((report: ReportResponse | null) => {
    if (report && selectedProjectId) {
      // Save to report provider which will persist to localStorage
      selectReport(selectedProjectId, report.id);
    }
    setSelectedReport(report as ProcessedReport | null);
  }, [setSelectedReport, selectReport, selectedProjectId]);

  // Handle model filter change
  const handleModelFilterChange = useCallback((models: string[]) => {
    setSelectedModels(models.length === 0 ? availableModels : models);
  }, [availableModels]);

  // Combined loading state
  const loading = loadingReports[selectedProjectId || ''] || loadingCompetition || reportLoading;


  if (!selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a company from the sidebar to view competition
                analysis.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageTransition loading={loading || accessLoading}>
      <div className="space-y-6">
      {/* Breadcrumb Navigation and Report Selector */}
      <div className="flex items-center justify-between">
        {token && allProjects.length > 0 && (
          <BreadcrumbNav
            projects={allProjects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
            currentPage="Competition"
            showReportSelector={false}
            token={token}
          />
        )}
        {projectReports.length > 0 && selectedProjectId && (
          <SingleReportSelector
            reports={projectReports}
            selectedReport={selectedReport}
            availableModels={availableModels}
            onReportChange={handleReportChange}
            onModelFilterChange={handleModelFilterChange}
          />
        )}
      </div>

      {/* Error State */}
      {(competitionError || reportError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{competitionError || reportError}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {(loadingCompetition || reportLoading) && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-32 w-full bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Content */}
      {!loadingCompetition && !reportLoading && selectedReport && competitionData && (
        <FeatureLockedWrapper
          isLocked={isFreePlan}
          featureName="Competition Analysis"
          description="Unlock competition analysis to see how AI models compare your brand against competitors."
        >
          <div className="space-y-6">
            {/* Competition Table */}
            {competitionData.competitorAnalyses &&
            competitionData.competitorAnalyses.length > 0 ? (
              <>
                <CompetitionTable
                  brand={competitionData.brandName || brandName}
                  data={competitionData}
                  selectedModels={selectedModels}
                />
                
                {/* Competition Watchtower */}
                <CompetitionWatchtower
                  citations={competitionData.citations}
                  loading={false}
                />
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No competition data available for this report.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        </FeatureLockedWrapper>
      )}

      {/* No Reports State */}
      {!loadingCompetition && !reportLoading && selectedProjectId && projectReports.length === 0 && (
        <ProcessingLoader />
      )}

      {/* No Selected Report */}
      {!loadingCompetition && !reportLoading && projectReports.length > 0 && !selectedReport && (
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a report from the dropdown above to view competition analysis.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </PageTransition>
  );
}

// Competition Table Component
function CompetitionTable({
  brand,
  data,
  selectedModels,
}: {
  brand: string;
  data: CompetitionTypeData;
  selectedModels: string[];
}) {
  // Get unique list of models across all competitor analyses
  const allModels = Array.from(
    new Set(
      (data.competitorAnalyses || []).flatMap((comp) =>
        (comp.analysisByModel || []).map((c) => c.model)
      )
    )
  );
  
  // Filter models based on selection
  const models = selectedModels.length > 0 
    ? allModels.filter(model => selectedModels.includes(model))
    : allModels;

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-mono-700 flex items-center gap-2">
          Competitive Analysis
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Summary of your strengths and weaknesses when compared to selected competitors across models' answers</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <p className="text-sm text-mono-400 mt-1">
          "Can you tell me the strengths and weaknesses of {brand} vs.
          competitor?"
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {data.competitorAnalyses.map((competitor, index) => (
            <div
              key={competitor.competitor}
              className="border border-mono-200 rounded-lg overflow-hidden"
            >
              <div className="bg-mono-100 px-4 py-3 border-b border-mono-200">
                <h3 className="text-base font-bold text-mono-900">
                  {brand} vs{" "}
                  <span className="text-primary-600">
                    {competitor.competitor}
                  </span>
                </h3>
              </div>
              <div className="p-3">
                <div>
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-mono-500 border-b-2 border-mono-200 w-[60px]"></th>
                        {models.map((model, mIndex) => {
                          return (
                            <th
                              key={mIndex}
                              className="px-3 py-2 text-left text-sm font-semibold text-mono-700 border-b-2 border-mono-200"
                            >
                              <ModelDisplay model={model} size="xs" />
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Strengths row */}
                      <tr className="bg-accent-50">
                        <td className="px-2 py-3 border-b border-mono-200 font-bold text-accent-700 text-sm text-center align-middle">
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
                              className="px-3 py-3 border-b border-mono-200 align-top"
                            >
                              <div className="space-y-1">
                                {analysis?.strengths.map((strength, sIndex) => (
                                  <div
                                    key={sIndex}
                                    className="flex items-start text-sm"
                                  >
                                    <span className="text-accent-600 mr-1 flex-shrink-0">
                                      •
                                    </span>
                                    <span className="text-mono-700">
                                      {strength}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      {/* Weaknesses row */}
                      <tr className="bg-destructive-50">
                        <td className="px-2 py-3 font-bold text-destructive-700 text-sm text-center align-middle">
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
                            <td key={mIndex} className="px-3 py-3 align-top">
                              <div className="space-y-1">
                                {analysis?.weaknesses.map((weakness, wIndex) => (
                                  <div
                                    key={wIndex}
                                    className="flex items-start text-sm"
                                  >
                                    <span className="text-destructive-600 mr-1 flex-shrink-0">
                                      •
                                    </span>
                                    <span className="text-mono-700">
                                      {weakness}
                                    </span>
                                  </div>
                                ))}
                              </div>
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
        {((data.commonStrengths && data.commonStrengths.length > 0) ||
          (data.commonWeaknesses && data.commonWeaknesses.length > 0)) && (
          <div className="mt-8 border border-mono-200 rounded-lg overflow-hidden">
            <div className="bg-mono-100 px-4 py-3 border-b border-mono-200">
              <h3 className="text-base font-bold text-mono-900">
                Common Patterns Across Competitors
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.commonStrengths && data.commonStrengths.length > 0 && (
                <div className="bg-accent-50 p-3 rounded-lg border border-accent-200">
                  <h4 className="font-semibold text-accent-700 mb-2">
                    Common Strengths
                  </h4>
                  <ul className="space-y-1">
                    {data.commonStrengths.map((strength, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-accent-600 mr-1 mt-0.5 flex-shrink-0">
                          •
                        </span>
                        <span className="text-mono-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.commonWeaknesses && data.commonWeaknesses.length > 0 && (
                <div className="bg-destructive-50 p-3 rounded-lg border border-destructive-200">
                  <h4 className="font-semibold text-destructive-700 mb-2">
                    Common Weaknesses
                  </h4>
                  <ul className="space-y-1">
                    {data.commonWeaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-destructive-600 mr-1 mt-0.5 flex-shrink-0">
                          •
                        </span>
                        <span className="text-mono-700">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}