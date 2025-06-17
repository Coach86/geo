"use client";

import { useState, useEffect } from "react";
import { useFeatureGate } from "@/hooks/use-feature-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import AttributeScoresByModelTable from "@/components/alignment/attribute-scores-table";
import { getBatchResults } from "@/lib/auth-api";
import { getReportAlignment } from "@/lib/api/report";
import { useAuth } from "@/providers/auth-provider";
import type { AlignmentResults, DetailedAlignmentResult } from "@/types/alignment";
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
import { FeatureLockedWrapper } from "@/components/shared/FeatureLockedWrapper";


export default function AlignmentPage() {
  const { token } = useAuth();
  const { hasAccess, isLoading: accessLoading, isFreePlan } = useFeatureGate("alignment");
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
        
        if (isFreePlan) {
          // Generate mock data for free plan users
          const attributes = projectDetails?.keyBrandAttributes || [
            "Innovation", 
            "Quality", 
            "Customer Service", 
            "Value", 
            "Reliability"
          ];
          
          const models = ["GPT-4", "Claude 3.5 Sonnet", "Gemini 1.5 Pro"];
          
          // Generate detailed results for each model
          const detailedResults: DetailedAlignmentResult[] = [];
          models.forEach((model, modelIndex) => {
            detailedResults.push({
              model: model,
              promptIndex: 0,
              originalPrompt: "How well does this brand align with its key attributes?",
              llmResponse: "This is a sample response demonstrating alignment analysis...",
              attributeScores: attributes.map(attr => ({
                attribute: attr,
                score: 0.4 + (Math.random() * 0.3) + (modelIndex * 0.05), // Random score between 0.4-0.7 with slight model variation
                evaluation: `The brand shows moderate alignment with ${attr}`
              })),
              usedWebSearch: false,
              citations: [],
              toolUsage: []
            });
          });

          // Calculate average scores
          const averageAttributeScores: Record<string, number> = {};
          attributes.forEach(attr => {
            const scores = detailedResults.map(r => 
              r.attributeScores.find(a => a.attribute === attr)?.score || 0
            );
            averageAttributeScores[attr] = scores.reduce((a, b) => a + b, 0) / scores.length;
          });

          // Calculate overall alignment score (average of all attribute scores)
          const overallScore = Object.values(averageAttributeScores).reduce((a, b) => a + b, 0) / 
                              Object.values(averageAttributeScores).length;

          const alignmentData: AlignmentResults = {
            summary: {
              overallAlignmentScore: Math.round(overallScore * 100),
              averageAttributeScores,
              attributeAlignmentSummary: attributes.map(attr => ({
                name: attr,
                mentionRate: "100%",
                alignment: averageAttributeScores[attr] > 0.6 ? "✅ High" : 
                           averageAttributeScores[attr] > 0.4 ? "⚠️ Medium" : "❌ Low"
              }))
            },
            detailedResults
          };
          setAlignmentData(alignmentData);
        } else {
          // Use the new brand-reports endpoint
          const alignmentResponse = await getReportAlignment(selectedReport.id, token);
          console.log("[Alignment] alignment data for report", selectedReport.id, ":", alignmentResponse);
          
          // Check if we need to transform the data
          if (alignmentResponse && Object.keys(alignmentResponse).length > 0) {
            // If the response has a results array, it needs transformation
            if (alignmentResponse.results && Array.isArray(alignmentResponse.results)) {
              const transformedData = transformAccordToAlignment(alignmentResponse);
              setAlignmentData(transformedData);
            } else if (alignmentResponse.summary && alignmentResponse.detailedResults) {
              // Already in the correct format
              setAlignmentData(alignmentResponse);
            } else if (alignmentResponse.overallAlignmentScore !== undefined && 
                      alignmentResponse.averageAttributeScores && 
                      alignmentResponse.detailedResults) {
              // New format from brand-reports endpoint - need to wrap in summary
              const alignmentData: AlignmentResults = {
                summary: {
                  overallAlignmentScore: alignmentResponse.overallAlignmentScore,
                  averageAttributeScores: alignmentResponse.averageAttributeScores,
                  attributeAlignmentSummary: alignmentResponse.attributeAlignmentSummary || []
                },
                detailedResults: alignmentResponse.detailedResults
              };
              setAlignmentData(alignmentData);
            } else {
              console.warn("[Alignment] Unexpected data format:", alignmentResponse);
              setAlignmentError("No alignment data available for this report");
              setAlignmentData(null);
            }
          } else {
            console.warn("[Alignment] No alignment data for report:", selectedReport.id);
            setAlignmentError("No alignment data available for this report");
            setAlignmentData(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch alignment data for report:", selectedReport.id, err);
        setAlignmentError("Failed to load alignment data");
        setAlignmentData(null);
      } finally {
        setIsLoadingAlignment(false);
      }
    };

    fetchAlignmentData();
  }, [selectedReport?.id, token, isFreePlan]); // Only depend on report ID, token, and plan type

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

  // Check feature access
  if (accessLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
      </div>
    );
  }


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
        <FeatureLockedWrapper
          isLocked={isFreePlan}
          featureName="Alignment Analysis"
          description="Unlock alignment analysis to understand how well AI models perceive your brand attributes."
        >
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
                      {alignmentData.summary?.overallAlignmentScore || 0}%
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
        </FeatureLockedWrapper>
      </div>
  );
}
