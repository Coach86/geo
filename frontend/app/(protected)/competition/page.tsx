"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useFeatureGate } from "@/hooks/use-feature-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ModelDisplay } from "@/components/shared/ModelDisplay";
import type { ReportResponse } from "@/types/reports";
import type { CompetitionData as CompetitionTypeData } from "@/types/competition";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { useNavigation } from "@/providers/navigation-provider";
import { ProcessingLoader } from "@/components/shared/ProcessingLoader";
import { FeatureLockedWrapper } from "@/components/shared/FeatureLockedWrapper";
import { CompetitionWatchtower } from "@/components/competition/CompetitionWatchtower";
import { ReportRangeSelector } from "@/components/shared/ReportRangeSelector";
import { useReports } from "@/providers/report-provider";
import { useCompetitionReports } from "@/hooks/use-competition-reports";


export default function CompetitionPage() {
  const { token } = useAuth();
  const { hasAccess, isLoading: accessLoading, isFreePlan } = useFeatureGate("competition");
  const { filteredProjects, selectedProject, setSelectedProject } = useNavigation();
  const { reports, loadingReports, fetchReports } = useReports();
  const selectedProjectId = selectedProject?.id || null;
  const projectReports = selectedProjectId ? reports[selectedProjectId] || [] : [];
  const brandName = selectedProject?.brandName || 'Brand';

  // State for date range and model filters
  const [selectedReports, setSelectedReports] = useState<ReportResponse[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [isAllTime, setIsAllTime] = useState<boolean>(false);

  // Memoize the date range object to prevent infinite re-renders
  const memoizedDateRange = useMemo(() => {
    return dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined;
  }, [dateRange?.start, dateRange?.end]);

  // Hook for competition data with citations
  const {
    loading: loadingAggregated,
    error: aggregatedError,
    competitionData: aggregatedCompetitionData,
    citations,
    availableModels: competitionAvailableModels,
    brandName: aggregatedBrandName
  } = useCompetitionReports(selectedProjectId, selectedModels, token, isAllTime, memoizedDateRange);

  // Handle range change from the selector
  const handleRangeChange = useCallback((start: Date, end: Date, reports: ReportResponse[], isAllTimeRange?: boolean) => {
    setDateRange({ start, end });
    setSelectedReports(reports);
    setIsAllTime(isAllTimeRange || false);
  }, []);

  // Handle model filter change
  const handleModelFilterChange = useCallback((models: string[]) => {
    setSelectedModels(models);
  }, []);

  // Update available models when competition data changes
  useEffect(() => {
    if (competitionAvailableModels && competitionAvailableModels.length > 0) {
      setAvailableModels(competitionAvailableModels);
      // Select all models by default when they become available for the first time
      if (selectedModels.length === 0 && availableModels.length === 0) {
        setSelectedModels(competitionAvailableModels);
      }
    }
  }, [competitionAvailableModels, selectedModels, availableModels]);



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
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      {token && filteredProjects.length > 0 && (
        <BreadcrumbNav
          projects={filteredProjects}
          selectedProject={selectedProject}
          onProjectSelect={setSelectedProject}
          currentPage="Competition"
          showReportSelector={false}
          token={token}
        />
      )}


      {/* Error State */}
      {aggregatedError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{aggregatedError}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loadingAggregated && (
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

      {/* Report Range Selector */}
      {projectReports.length > 0 && selectedProjectId && (
        <ReportRangeSelector
          reports={projectReports}
          projectId={selectedProjectId}
          availableModels={availableModels}
          onRangeChange={handleRangeChange}
          onModelFilterChange={handleModelFilterChange}
        />
      )}

      {/* Report Content */}
      {!loadingAggregated && aggregatedCompetitionData && (
        <FeatureLockedWrapper
          isLocked={isFreePlan}
          featureName="Competition Analysis"
          description="Unlock competition analysis to see how AI models compare your brand against competitors."
        >
          <div className="space-y-6">
            {/* Competition Table */}
            {aggregatedCompetitionData.competitorAnalyses &&
            aggregatedCompetitionData.competitorAnalyses.length > 0 ? (
              <>
                <CompetitionTable
                  brand={aggregatedBrandName || brandName}
                  data={aggregatedCompetitionData}
                />
                
                {/* Competition Watchtower */}
                <CompetitionWatchtower
                  citations={citations}
                  loading={loadingAggregated}
                />
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No competition data available for the selected time range.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        </FeatureLockedWrapper>
      )}

      {/* No Reports State */}
      {!loadingAggregated && selectedProjectId && projectReports.length === 0 && (
        <ProcessingLoader />
      )}
    </div>
  );
}

// Competition Table Component
function CompetitionTable({
  brand,
  data,
}: {
  brand: string;
  data: CompetitionTypeData;
}) {
  // Get unique list of models across all competitor analyses
  const models = Array.from(
    new Set(
      (data.competitorAnalyses || []).flatMap((comp) =>
        (comp.analysisByModel || []).map((c) => c.model)
      )
    )
  );

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-mono-700">
          Competition Analysis vs Pre‑selected Competitors
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