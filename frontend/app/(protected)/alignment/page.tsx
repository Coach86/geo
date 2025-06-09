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
import { ProcessingLoader } from "@/components/shared/ProcessingLoader";


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

  // Clear alignment data when project changes
  useEffect(() => {
    console.log("[Alignment] Project changed, clearing data. New project:", selectedProjectId);
    setAlignmentData(null);
    setAlignmentError(null);
    setIsLoadingAlignment(false);
  }, [selectedProjectId]);

  // Fetch alignment data when report changes
  useEffect(() => {
    // Clear data immediately when report changes
    setAlignmentData(null);
    setAlignmentError(null);
    
    const fetchAlignmentData = async () => {
      if (!selectedReport || !token) {
        return;
      }

      setIsLoadingAlignment(true);

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
          setAlignmentData(null);
        }
      } catch (err) {
        console.error("Failed to fetch batch results for report:", selectedReport.id, err);
        setAlignmentError("Failed to load alignment data");
        setAlignmentData(null);
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


  if (!selectedReport || !alignmentData) return <ProcessingLoader />;

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
            onReportSelect={(report) => {
              setSelectedReport(report);
            }}
          />
        )}


        {/* Main Content */}
        <div className="space-y-8">
          {/* Overall Alignment Snapshot Header */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-mono-700">
                    Overall Alignment Snapshot
                  </h2>
                  <p className="text-sm text-mono-400 mt-1">
                    Average alignment across all models
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary-600">
                    {(
                      alignmentData.summary.overallAlignmentScore *
                      100
                    ).toFixed(0)}%
                  </div>
                  <p className="text-sm text-mono-400 mt-1">
                    Alignment Score
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-mono-700">
                  Attribute Scores by Model
                </CardTitle>
                <p className="text-sm text-mono-400 mt-1">
                  Detailed breakdown of alignment scores for each attribute
                  across different LLMs. Click on a score cell for an in-depth
                  view.
                </p>
              </CardHeader>
              <CardContent>
                <AttributeScoresByModelTable
                  results={alignmentData}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
