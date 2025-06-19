"use client";

import { useState, useEffect, useCallback } from "react";
import { useFeatureGate } from "@/hooks/use-feature-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import AttributeScoresByModelTable from "@/components/alignment/attribute-scores-table";
import { useAuth } from "@/providers/auth-provider";
import type { AlignmentResults } from "@/types/alignment";
import type { ReportResponse } from "@/types/reports";
import { ReportRangeSelector } from "@/components/shared/ReportRangeSelector";
import { useAlignmentReports } from "@/hooks/use-alignment-reports";
import { useReports } from "@/providers/report-provider";
import { AlignmentScoreCard } from "@/components/alignment/AlignmentScoreCard";
import { AlignmentTrendChart } from "@/components/alignment/AlignmentTrendChart";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { useNavigation } from "@/providers/navigation-provider";
import { ProcessingLoader } from "@/components/shared/ProcessingLoader";
import { FeatureLockedWrapper } from "@/components/shared/FeatureLockedWrapper";


export default function AlignmentPage() {
  const { token } = useAuth();
  const { hasAccess, isLoading: accessLoading, isFreePlan } = useFeatureGate("alignment");
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
  } = useAlignmentReports(selectedReports, selectedModels, token);

  // Handle date range change
  const handleRangeChange = useCallback((start: Date, end: Date, reports: ReportResponse[]) => {
    setDateRange({ start, end });
    setSelectedReports(reports);
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
    <div className="space-y-6">
      {/* Breadcrumb Navigation with Report Range Selector */}
      <div className="flex items-center justify-between">
        {token && filteredProjects.length > 0 && (
          <BreadcrumbNav
            projects={filteredProjects}
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
            {/* First Row: 3 columns layout like visibility */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Alignment Score Card - 1 column */}
              <div>
                <AlignmentScoreCard
                  brandName={brandName}
                  averageScore={averageScore}
                  scoreVariation={scoreVariation}
                  loading={loadingAlignment}
                />
              </div>

              {/* Alignment Trend Chart - Takes 2 columns */}
              <div className="md:col-span-2">
                <AlignmentTrendChart
                  data={chartData}
                  brandName={brandName}
                />
              </div>
            </div>

            {/* Second Row: 3 columns layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Coming Soon - 1 column */}
              <div>
                <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Coming Soon
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 flex items-center justify-center">
                      <p className="text-sm text-gray-500 italic">
                        New feature coming soon
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Attribute Scores by Model - Takes 2 columns */}
              <div className="md:col-span-2">
                <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-mono-700">
                      Attribute Scores by Model
                    </CardTitle>
                    <p className="text-sm text-mono-400 mt-1">
                      Detailed breakdown of alignment scores
                    </p>
                  </CardHeader>
                  <CardContent>
                    {detailedResults.length > 0 && (
                      <AttributeScoresByModelTable
                        results={{
                          summary: {
                            overallAlignmentScore: averageScore,
                            averageAttributeScores: aggregatedAttributeScores,
                            attributeAlignmentSummary: []
                          },
                          detailedResults: detailedResults.flatMap(r => r.detailedResults)
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
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
  );
}
