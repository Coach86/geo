"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { ReportResponse } from "@/types/reports";
import { ReportRangeSelector } from "@/components/shared/ReportRangeSelector";
import { VisibilityMetricsCard } from "@/components/visibility/VisibilityMetricsCard";
import { VisibilityTrendChart } from "@/components/visibility/VisibilityTrendChart";
import { MentionsListCard } from "@/components/visibility/MentionsListCard";
import { TopSourcesCard } from "@/components/visibility/TopSourcesCard";
import { useVisibilityReports } from "@/hooks/use-visibility-reports";
import { useAggregatedExplorer } from "@/hooks/use-aggregated-explorer";
import { useReports } from "@/providers/report-provider";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { useNavigation } from "@/providers/navigation-provider";
import { ProcessingLoader } from "@/components/shared/ProcessingLoader";


export default function VisibilityPage() {
  const { token } = useAuth();
  const { filteredProjects, selectedProject, setSelectedProject } = useNavigation();
  const { reports, loadingReports, fetchReports } = useReports();

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
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);

  // Fetch reports when project changes
  useEffect(() => {
    if (selectedProjectId && token) {
      fetchReports(selectedProjectId, token);
    }
  }, [selectedProjectId, token, fetchReports]);

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
  } = useVisibilityReports(selectedProjectId, selectedModels, token, isAllTime, memoizedDateRange);

  const {
    loading: loadingExplorer,
    error: explorerError,
    topMentions,
    topKeywords,
    topSources,
  } = useAggregatedExplorer(selectedProjectId, token, memoizedDateRange);

  // Show all competitors by default
  const selectedCompetitors = competitors.map(c => c.name);

  // Handle date range change
  const handleRangeChange = useCallback((start: Date, end: Date, reports: ReportResponse[], isAllTimeRange?: boolean) => {
    console.log('[VisibilityPage] handleRangeChange called with:', {
      start: start.toISOString(),
      end: end.toISOString(),
      reportsCount: reports.length,
      isAllTimeRange
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
  }, []);

  // Update available models when visibility data changes
  useEffect(() => {
    if (visibilityAvailableModels && visibilityAvailableModels.length > 0) {
      // Only update if the models have actually changed
      const modelsChanged = JSON.stringify(availableModels) !== JSON.stringify(visibilityAvailableModels);
      if (modelsChanged) {
        setAvailableModels(visibilityAvailableModels);
        // Select all models by default when they become available for the first time
        if (selectedModels.length === 0 && availableModels.length === 0) {
          setSelectedModels(visibilityAvailableModels);
        }
      }
    }
  }, [visibilityAvailableModels, selectedModels, availableModels]);

  // Handle model filter change
  const handleModelFilterChange = useCallback((models: string[]) => {
    setSelectedModels(models);
  }, []);


  const loading = loadingReports[selectedProjectId || ''] || loadingVisibility || loadingExplorer;
  const error = visibilityError || explorerError;


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
    <div className="space-y-6">
      {/* Breadcrumb Navigation with new Report Range Selector */}
      <div className="flex items-center justify-between">
        {token && filteredProjects.length > 0 && (
          <BreadcrumbNav
            projects={filteredProjects}
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

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-3">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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
                mentions={topMentions.map(item => ({ mention: item.name, count: item.count }))}
                loading={loadingExplorer}
              />
            </div>

            {/* Top Sources */}
            <div>
              <TopSourcesCard
                sources={topSources.map(item => ({ domain: item.name, count: item.count }))}
                loading={loadingExplorer}
              />
            </div>

            {/* Placeholder */}
            <div>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Coming Soon
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-32 flex items-center justify-center">
                    <p className="text-sm text-gray-500 italic">
                      New feature coming soon
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* No Reports State */}
      {!loading && projectReports.length === 0 && selectedProjectId && (
        <ProcessingLoader />
      )}

      {/* No Selected Reports */}
      {!loading && projectReports.length > 0 && selectedReports.length === 0 && (
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a date range to view visibility data.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
