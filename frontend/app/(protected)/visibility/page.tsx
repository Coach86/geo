"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { NoAnalysisDataCard } from "@/components/shared/NoAnalysisDataCard";
import type { ReportResponse } from "@/types/reports";
import { ReportRangeSelector } from "@/components/shared/ReportRangeSelector";
import { VisibilityMetricsCard } from "@/components/visibility/VisibilityMetricsCard";
import { VisibilityTrendChart } from "@/components/visibility/VisibilityTrendChart";
import { MentionsListCard } from "@/components/visibility/MentionsListCard";
import { TopDomainRankingCard } from "@/components/visibility/TopDomainRankingCard";
import { DomainSourceChart } from "@/components/visibility/DomainSourceChart";
import { VisibilityCitationsTable } from "@/components/visibility/VisibilityCitationsTable";
import { useVisibilityReports } from "@/hooks/use-visibility-reports";
import { useVisibilityCitations } from "@/hooks/use-visibility-citations";
import { useReports } from "@/providers/report-provider";
import { useNavigation } from "@/providers/navigation-provider";
import { ProcessingLoader } from "@/components/shared/ProcessingLoader";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { PageTransition } from "@/components/shared/PageTransition";
import { usePageTransition } from "@/providers/page-transition-provider";
import { usePostHogFlags } from "@/hooks/use-posthog-flags";


export default function VisibilityPage() {
  const { token } = useAuth();
  const { allProjects, selectedProject, setSelectedProject } = useNavigation();
  const { isFeatureEnabled } = usePostHogFlags();
  const { reports, loadingReports, fetchReports } = useReports();
  const { endTransition } = usePageTransition();

  // Get selected project from localStorage
  const selectedProjectId = typeof window !== 'undefined'
    ? localStorage.getItem('selectedProjectId')
    : null;

  const projectReports = selectedProjectId ? reports[selectedProjectId] || [] : [];
  const brandName = selectedProject?.brandName || 'Brand';

  // State for date range and model filters
  const [selectedReports, setSelectedReports] = useState<ReportResponse[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [isAllTime, setIsAllTime] = useState<boolean>(false);
  const [isLatest, setIsLatest] = useState<boolean>(false);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);

  // Fetch reports when project changes
  useEffect(() => {
    if (selectedProjectId && token) {
      fetchReports(selectedProjectId, token);
    }
  }, [selectedProjectId, token, fetchReports]);

  // End transition when page is loaded
  useEffect(() => {
    endTransition();
  }, [endTransition]);

  // Memoize the date range object to prevent infinite re-renders
  const memoizedDateRange = useMemo(() => {
    return dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined;
  }, [dateRange?.start, dateRange?.end]);

  // Hooks for visibility data
  const {
    loading: loadingVisibility,
    error: visibilityError,
    averageScore,
    scoreVariation,
    competitors,
    chartData,
    modelBreakdown,
    availableModels: visibilityAvailableModels,
    topMentions: visibilityTopMentions,
    topDomains,
    totalPromptsTested,
    domainSourceAnalysis,
  } = useVisibilityReports(selectedProjectId, selectedModels, token, isAllTime, memoizedDateRange, isLatest);
  
  // Hook for visibility citations
  const {
    loading: loadingCitations,
    error: citationsError,
    citations,
  } = useVisibilityCitations(selectedProjectId, selectedModels, token, isAllTime, memoizedDateRange, isLatest);

  // Update available models when visibility data changes
  useEffect(() => {
    if (visibilityAvailableModels && visibilityAvailableModels.length > 0) {
      setAvailableModels(visibilityAvailableModels);
    }
  }, [visibilityAvailableModels]);

  // Show all competitors by default
  const selectedCompetitors = competitors.map(c => c.name);

  // Handle date range change
  const handleRangeChange = useCallback((start: Date, end: Date, reports: ReportResponse[], isAllTimeRange?: boolean, isLatestReport?: boolean) => {
    console.log('[VisibilityPage] handleRangeChange called with:', {
      start: start.toISOString(),
      end: end.toISOString(),
      reportsCount: reports.length,
      isAllTimeRange,
      isLatestReport
    });
    
    setDateRange(prev => {
      // Only update if dates actually changed
      if (prev?.start.getTime() === start.getTime() && prev?.end.getTime() === end.getTime()) {
        console.log('[VisibilityPage] Date range unchanged, skipping update');
        return prev;
      }
      console.log('[VisibilityPage] Date range changed, updating');
      return { start, end };
    });
    setSelectedReports(reports);
    setIsAllTime(isAllTimeRange || false);
    setIsLatest(isLatestReport || false);
  }, []);

  // Update available models when visibility data changes
  useEffect(() => {
    if (visibilityAvailableModels && visibilityAvailableModels.length > 0) {
      setAvailableModels(visibilityAvailableModels);
    }
  }, [visibilityAvailableModels]);

  // Handle model filter change
  const handleModelFilterChange = useCallback((models: string[]) => {
    setSelectedModels(models);
  }, []);


  const loading = loadingReports[selectedProjectId || ''] || loadingVisibility || loadingCitations;
  const error = visibilityError || citationsError;


  if (!selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a project from the sidebar to view visibility
                metrics.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageTransition loading={loading}>
      <div className="space-y-6">
      {/* Breadcrumb Navigation and Report Range Selector */}
      <div className="flex items-center justify-between">
        {token && allProjects.length > 0 && (
          <BreadcrumbNav
            projects={allProjects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
            currentPage="Visibility"
            showReportSelector={false}
            token={token}
          />
        )}
        {projectReports.length > 0 && selectedProjectId && (
          <ReportRangeSelector
            reports={projectReports}
            projectId={selectedProjectId}
            availableModels={availableModels}
            onRangeChange={handleRangeChange}
            onModelFilterChange={handleModelFilterChange}
          />
        )}
      </div>


      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}


      {/* Main Content */}
      {!loading && selectedReports.length > 0 && (
        <div className="space-y-6 fade-in-section is-visible">
          {/* First Row: Visibility Metrics and Trend Chart */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Visibility Metrics - 1 column */}
            <div>
              <VisibilityMetricsCard
                brandName={brandName}
                averageScore={averageScore}
                scoreVariation={scoreVariation}
                competitors={competitors}
                selectedCompetitors={[]}
                onCompetitorToggle={() => {}}
                onEntityHover={setHoveredEntity}
                hoveredEntity={hoveredEntity}
                isAllTime={isAllTime}
                totalPromptsTested={totalPromptsTested}
              />
            </div>

            {/* Visibility Trend Chart - Takes 2 columns */}
            <div className="md:col-span-2">
              <VisibilityTrendChart
                data={chartData}
                brandName={brandName}
                selectedCompetitors={selectedCompetitors}
                hoveredEntity={hoveredEntity}
                onEntityHover={setHoveredEntity}
              />
            </div>
          </div>

          {/* Second Row: 3 equal columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Mentions */}
            <div>
              <MentionsListCard
                mentions={visibilityTopMentions}
                loading={loadingVisibility}
              />
            </div>

            {/* Top Domain Ranking */}
            <div>
              <TopDomainRankingCard
                domains={topDomains}
                loading={loadingVisibility}
                totalPromptsTested={totalPromptsTested}
              />
            </div>

            {/* Domain Source Chart */}
            <div>
              <DomainSourceChart
                domainSourceAnalysis={domainSourceAnalysis}
                loading={loadingVisibility}
                brandName={brandName}
              />
            </div>
          </div>

          {/* Third Row: Citations Analysis Table */}
          {(process.env.NODE_ENV === 'development' || isFeatureEnabled('visibility-sources-analysis')) && (
            <div>
              <VisibilityCitationsTable
                citations={citations}
                loading={loadingCitations}
                brandName={brandName}
              />
            </div>
          )}
        </div>
      )}

      {/* No Reports State */}
      {!loading && projectReports.length === 0 && selectedProjectId && (
        <ProcessingLoader />
      )}

      {/* No Selected Reports */}
      {!loading && projectReports.length > 0 && selectedReports.length === 0 && (
        <div className="flex items-center justify-center h-[50vh]">
          <NoAnalysisDataCard />
        </div>
      )}
      </div>
    </PageTransition>
  );
}
