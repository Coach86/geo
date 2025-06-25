"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useFeatureGate } from "@/hooks/use-feature-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { AttributeScoresWithSelector } from "@/components/alignment/AttributeScoresWithSelector";
import { useAuth } from "@/providers/auth-provider";
import type { AlignmentResults } from "@/types/alignment";
import type { ReportResponse } from "@/types/reports";
import { ReportRangeSelector } from "@/components/shared/ReportRangeSelector";
import { useAlignmentReports } from "@/hooks/use-alignment-reports";
import { useReports } from "@/providers/report-provider";
import { AlignmentScoreCard } from "@/components/alignment/AlignmentScoreCard";
import { AlignmentTrendChart } from "@/components/alignment/AlignmentTrendChart";
import { useNavigation } from "@/providers/navigation-provider";
import { ProcessingLoader } from "@/components/shared/ProcessingLoader";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { FeatureLockedWrapper } from "@/components/shared/FeatureLockedWrapper";
import { SourcesWatchtower } from "@/components/shared/SourcesWatchtower";
import { SourcesAnalysis } from "@/components/shared/SourcesAnalysis";
import { PageTransition } from "@/components/shared/PageTransition";


export default function AlignmentPage() {
  const { token } = useAuth();
  const { hasAccess, isLoading: accessLoading, isFreePlan } = useFeatureGate("alignment");
  const { allProjects, selectedProject, setSelectedProject } = useNavigation();
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
  const [isLatest, setIsLatest] = useState<boolean>(false);
  const [selectedAttributeReport, setSelectedAttributeReport] = useState<ReportResponse | null>(null);

  // Memoize the date range object to prevent infinite re-renders
  const memoizedDateRange = useMemo(() => {
    return dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined;
  }, [dateRange?.start, dateRange?.end]);

  // Fetch reports when project changes
  useEffect(() => {
    if (selectedProjectId && token) {
      fetchReports(selectedProjectId, token);
    }
  }, [selectedProjectId, token, fetchReports]);

  // Hook for alignment data
  const {
    loading: loadingAlignment,
    error: alignmentError,
    averageScore,
    scoreVariation,
    chartData,
    aggregatedAttributeScores,
    availableModels: alignmentAvailableModels,
    detailedResults,
    citations,
  } = useAlignmentReports(selectedProjectId, selectedModels, token, isAllTime, memoizedDateRange, isLatest);

  // Handle date range change
  const handleRangeChange = useCallback((start: Date, end: Date, reports: ReportResponse[], isAllTimeRange?: boolean, isLatestReport?: boolean) => {
    console.log('[AlignmentPage] handleRangeChange called with:', {
      start: start.toISOString(),
      end: end.toISOString(),
      reportsCount: reports.length,
      isAllTimeRange,
      isLatestReport
    });
    
    setDateRange(prev => {
      // Only update if dates actually changed
      if (prev?.start.getTime() === start.getTime() && prev?.end.getTime() === end.getTime()) {
        console.log('[AlignmentPage] Date range unchanged, skipping update');
        return prev;
      }
      console.log('[AlignmentPage] Date range changed, updating');
      return { start, end };
    });
    setSelectedReports(reports);
    setIsAllTime(isAllTimeRange || false);
    setIsLatest(isLatestReport || false);
  }, []);

  // Update available models when alignment data changes
  useEffect(() => {
    if (alignmentAvailableModels && alignmentAvailableModels.length > 0) {
      const modelsChanged = JSON.stringify(availableModels) !== JSON.stringify(alignmentAvailableModels);
      if (modelsChanged) {
        setAvailableModels(alignmentAvailableModels);
        // Select all models by default when they become available for the first time
        if (selectedModels.length === 0 && availableModels.length === 0) {
          setSelectedModels(alignmentAvailableModels);
        }
      }
    }
  }, [alignmentAvailableModels, selectedModels, availableModels]);

  // Handle model filter change
  const handleModelFilterChange = useCallback((models: string[]) => {
    setSelectedModels(models);
  }, []);

  const loading = loadingReports[selectedProjectId || ''] || loadingAlignment;
  const error = alignmentError;


  if (!selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a project from the sidebar to view alignment
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
      {/* Breadcrumb Navigation and Report Range Selector */}
      <div className="flex items-center justify-between">
        {token && allProjects.length > 0 && (
          <BreadcrumbNav
            projects={allProjects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
            currentPage="Alignment"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-32 bg-gray-200 rounded w-full animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && selectedReports.length > 0 && (
        <FeatureLockedWrapper
          isLocked={isFreePlan}
          featureName="Alignment Analysis"
          description="Unlock alignment analysis to understand how well AI models perceive your brand attributes."
        >
          <div className="space-y-6 fade-in-section is-visible">
            {/* First Row: 3 columns grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[400px]">
              {/* Left Column: Table-like structure with 2 rows for cards - 1 column */}
              <div className="flex flex-col gap-6 h-full">
                {/* Row 1: Alignment Score */}
                <div className="flex-1">
                  <AlignmentScoreCard
                    brandName={brandName}
                    averageScore={averageScore}
                    scoreVariation={scoreVariation}
                    loading={loadingAlignment}
                    isAllTime={isAllTime}
                  />
                </div>
                
                {/* Row 2: Sources Analysis */}
                <div className="flex-1">
                  <SourcesAnalysis
                    citations={citations}
                    type="alignment"
                    loading={loadingAlignment}
                  />
                </div>
              </div>

              {/* Right Column: Alignment Trend Chart - Takes 2 columns */}
              <div className="md:col-span-2 h-full">
                <AlignmentTrendChart
                  data={chartData}
                  brandName={brandName}
                />
              </div>
            </div>

            {/* Second Row: Attribute Scores by Model - Full width */}
            <div className="grid grid-cols-1 gap-6">
              <AttributeScoresWithSelector
                reports={selectedReports}
                selectedReport={selectedAttributeReport}
                onReportSelect={setSelectedAttributeReport}
                token={token}
              />
            </div>

            {/* Sources Watchtower - Full width */}
            <div className="mt-6">
              <SourcesWatchtower
                citations={citations}
                type="alignment"
                loading={loadingAlignment}
              />
            </div>
          </div>
        </FeatureLockedWrapper>
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
                  Please select a date range to view alignment data.
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
