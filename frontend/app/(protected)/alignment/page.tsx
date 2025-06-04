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

interface ProcessedReport extends ReportResponse {
  reportDate: string;
  createdAt: string;
  alignmentData: AlignmentResults;
  brandName: string;
}

export default function AlignmentPage() {
  const { token } = useAuth();
  const { filteredProjects, selectedProject, setSelectedProject } = useNavigation();
  const {
    selectedProjectId,
    projectDetails,
    selectedReport: baseSelectedReport,
    setSelectedReport: setBaseSelectedReport,
    loading: baseLoading,
    error: baseError
  } = useReportData<ReportResponse>();

  const [selectedReport, setSelectedReport] = useState<ProcessedReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Process selected report when it changes
  useEffect(() => {
    const processReport = async () => {
      if (!baseSelectedReport || !token) {
        setSelectedReport(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log("[Alignment] Processing report:", baseSelectedReport.id);
        // Always fetch batch results for compliance/accord data
        let complianceData = null;
        try {
          const batchResults = await getBatchResults(baseSelectedReport.id, token);
          console.log(
            "[Alignment] batchResults for report",
            baseSelectedReport.id,
            ":",
            batchResults
          );
          // Find the accuracy pipeline results (support both resultType and pipelineType for compatibility)
          const accuracyResult = batchResults.find(
            (result: any) =>
              result.resultType === "accuracy" ||
              result.pipelineType === "accuracy"
          );
          console.log(accuracyResult);
          if (accuracyResult && accuracyResult.result) {
            // If results is a string, parse it
            const accuracyData =
              typeof accuracyResult.result === "string"
                ? JSON.parse(accuracyResult.result)
                : accuracyResult.result;

            alignmentData = transformAccordToAlignment(accuracyData);
          } else {
            console.warn(
              "[Alignment] No accuracy batch result for report:",
              baseSelectedReport.id
            );
          }
        } catch (err) {
          console.error(
            "Failed to fetch batch results for report:",
            baseSelectedReport.id,
            err
          );
        }

        if (alignmentData) {
          const processedReport: ProcessedReport = {
            ...baseSelectedReport,
            reportDate: baseSelectedReport.generatedAt,
            createdAt: baseSelectedReport.generatedAt,
            alignmentData,
            brandName: (baseSelectedReport as any).brand || projectDetails?.brandName || "Your Brand",
          };
          setSelectedReport(processedReport);
        } else {
          setError("No alignment data available for this report");
        }
      } catch (err) {
        console.error("Failed to process alignment data:", err);
        setError("Failed to load alignment data");
      } finally {
        setIsLoading(false);
      }
    };

    processReport();
  }, [baseSelectedReport, token, projectDetails]);

  const finalLoading = baseLoading || isLoading;
  const finalError = baseError || error;

  if (finalLoading) return <AlignmentLoading />;

  if (finalError) return <AlignmentError error={finalError} />;

  if (!selectedProjectId || !token) return <AlignmentNoProject />;


  if (!selectedReport) return <AlignmentNoData />;

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
            onReportSelect={setBaseSelectedReport}
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
                selectedReport.alignmentData.summary.overallAlignmentScore *
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
                    results={selectedReport.alignmentData}
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
