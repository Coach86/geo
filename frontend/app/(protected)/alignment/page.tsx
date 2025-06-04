"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import AttributeScoresByModelTable from "@/components/alignment/attribute-scores-table";
import { getBatchResults } from "@/lib/auth-api";
import { useAuth } from "@/providers/auth-provider";
import type { AlignmentResults } from "@/types/alignment";
import { transformAccordToAlignment } from "@/utils/alignment-transformer";
import {
  AlignmentLoading,
  AlignmentError,
  AlignmentNoProject,
  AlignmentNoData,
} from "@/components/alignment/AlignmentStates";
import type { AttributeItem } from "@/types/reports";
import { ReportSelector } from "@/components/shared/ReportSelector";
import { useReportData } from "@/hooks/use-report-data";
import type { ReportResponse } from "@/types/reports";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { useNavigation } from "@/providers/navigation-provider";


export default function AlignmentPage() {
  const { token } = useAuth();
  const { filteredProjects, selectedProject, setSelectedProject } = useNavigation();
  const [alignmentData, setAlignmentData] = useState<AlignmentResults | null>(null);
  const [isLoadingAlignment, setIsLoadingAlignment] = useState(false);
  const [alignmentError, setAlignmentError] = useState<string | null>(null);
  
  const {
    selectedProjectId,
    projectDetails,
    selectedReport,
    setSelectedReport,
    loading,
    error
  } = useReportData();

  // Fetch alignment data when report changes
  useEffect(() => {
    const fetchAlignmentData = async () => {
      if (!selectedReport || !token) {
        setAlignmentData(null);
        return;
      }

      setIsLoadingAlignment(true);
      setAlignmentError(null);

      try {
        console.log("[Alignment] Processing report:", selectedReport.id);
        const batchResults = await getBatchResults(selectedReport.id, token);
        console.log("[Alignment] batchResults for report", selectedReport.id, ":", batchResults);
        
        // Find the accuracy pipeline results
        const accuracyResult = batchResults.find(
          (result: any) =>
            result.resultType === "accuracy" ||
            result.pipelineType === "accuracy"
        );
        
        if (accuracyResult && accuracyResult.result) {
          const accuracyData =
            typeof accuracyResult.result === "string"
              ? JSON.parse(accuracyResult.result)
              : accuracyResult.result;

          const transformedData = transformAccordToAlignment(accuracyData);
          setAlignmentData(transformedData);
        } else {
          console.warn("[Alignment] No accuracy batch result for report:", selectedReport.id);
          setAlignmentError("No alignment data available for this report");
        }
      } catch (err) {
        console.error("Failed to fetch batch results for report:", selectedReport.id, err);
        setAlignmentError("Failed to load alignment data");
      } finally {
        setIsLoadingAlignment(false);
      }
    };

    fetchAlignmentData();
  }, [selectedReport?.id, token]); // Only depend on report ID and token

  const finalLoading = loading || isLoadingAlignment;
  const finalError = error || alignmentError;

  console.log("[Alignment] States:", {
    loading,
    isLoadingAlignment,
    finalLoading,
    selectedReport: !!selectedReport,
    alignmentData: !!alignmentData,
    error,
    alignmentError
  });

  if (finalLoading) return <AlignmentLoading />;

  if (finalError) return <AlignmentError error={finalError} />;

  if (!selectedProjectId || !token) return <AlignmentNoProject />;


  if (!selectedReport || !alignmentData) return <AlignmentNoData />;

  return (
    <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        {token && filteredProjects.length > 0 && (
          <BreadcrumbNav
            projects={filteredProjects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
            currentPage="Alignment"
            showReportSelector={true}
            token={token}
          />
        )}


        {/* Main Content */}
        <div className="space-y-8">
          {/* Overall Alignment Snapshot Header (keep this) */}
          <div className="w-full bg-white rounded-lg shadow-md border border-gray-200 px-6 py-6 flex items-center justify-between">
            <div className="text-left">
              <h2 className="text-lg font-semibold text-gray-700">
                Overall Alignment Snapshot
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Average alignment across all models.
              </p>
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-primary-500">
              {(
                alignmentData.summary.overallAlignmentScore *
                100
              ).toFixed(0)}
              %
            </span>
          </div>

          <div>
            <Card className="w-full bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <CardHeader className="px-6 py-5 border-b border-gray-200 bg-gray-50/80">
                <CardTitle className="text-lg font-semibold text-gray-700">
                  Attribute Scores by Model
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  Detailed breakdown of alignment scores for each attribute
                  across different LLMs. Click on a score cell for an in-depth
                  view.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 sm:p-6">
                  <AttributeScoresByModelTable
                    results={alignmentData}
                  />
                </div>
                <div className="px-6 py-3 bg-gray-50/80 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Data sourced from the latest brand intelligence report.
                    Alignment scores are calculated based on attribute
                    alignment and accuracy metrics.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
