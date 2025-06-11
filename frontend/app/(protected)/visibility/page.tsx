"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { ReportResponse } from "@/types/reports";
import { VisibilityAnalysis } from "@/components/visibility/VisibilityAnalysis";
import { useReportData } from "@/hooks/use-report-data";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { useNavigation } from "@/providers/navigation-provider";
import { ProcessingLoader } from "@/components/shared/ProcessingLoader";
import { getReportVisibility } from "@/lib/api/report";

interface ProcessedReport extends ReportResponse {
  createdAt: string;
  reportDate: string;
  mentionRate: number;
  modeMetrics: {
    model: string;
    mentionRate: number;
  }[];
  arenaMetrics: {
    model: string;
    mentions: number;
    score: number;
    rank: number;
  }[];
  arenaData: any[]; // Full arena data for table
  brandName: string;
}

interface VisibilityData {
  overallMentionRate: number;
  promptsTested: number;
  modelVisibility: {
    model: string;
    mentionRate: number;
  }[];
  arenaMetrics: {
    model: string;
    mentions: number;
    score: number;
    rank: number;
  }[];
}

export default function VisibilityPage() {
  const { token } = useAuth();
  const { filteredProjects, selectedProject, setSelectedProject } = useNavigation();
  const {
    selectedProjectId,
    projectDetails,
    selectedReport,
    setSelectedReport,
    loading,
    error
  } = useReportData<ProcessedReport>((report, project) => {
    // Process report data for visibility analysis
    const reportData = report as any;
    
    return {
      ...report,
      projectId: report.projectId,
      reportDate: report.metadata?.date || report.generatedAt,
      createdAt: report.generatedAt,
      mentionRate: parseInt(
        reportData.kpi?.pulse?.value || reportData.pulse?.value || "0"
      ),
      modeMetrics:
        reportData.pulse?.modelVisibility?.map((mv: any) => ({
          model: mv.model,
          mentionRate: mv.value || 0,
        })) || [],
      arenaMetrics: (() => {
        const arenaData = reportData.arena?.competitors || [];
        const brandName = reportData.brand || (report.metadata as any)?.brand || project.brandName;
        const metrics: any[] = [];
        const brandInArena = arenaData.find(
          (comp: any) =>
            comp.name.toLowerCase() === brandName.toLowerCase()
        );
        if (brandInArena?.modelsMentionsRate) {
          brandInArena.modelsMentionsRate.forEach(
            (mmr: any, index: number) => {
              metrics.push({
                model: mmr.model,
                mentions: mmr.mentionsRate,
                score: mmr.mentionsRate / 10,
                rank: index + 1,
              });
            }
          );
        }
        return metrics;
      })(),
      arenaData: reportData.arena?.competitors || [],
      brandName: reportData.brand || (report.metadata as any)?.brand || project.brandName,
    };
  });

  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  const [visibilityData, setVisibilityData] = useState<VisibilityData | null>(null);
  const [loadingVisibility, setLoadingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  // Fetch visibility data when selected report changes
  useEffect(() => {
    const fetchVisibilityData = async () => {
      if (!selectedReport || !token) {
        setVisibilityData(null);
        return;
      }

      setLoadingVisibility(true);
      setVisibilityError(null);

      try {
        const data = await getReportVisibility(selectedReport.id, token);
        setVisibilityData(data);
      } catch (err) {
        console.error("Failed to fetch visibility data:", err);
        setVisibilityError("Failed to load visibility data. Please try again later.");
      } finally {
        setLoadingVisibility(false);
      }
    };

    fetchVisibilityData();
  }, [selectedReport, token]);


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
        {/* Breadcrumb Navigation */}
        {token && filteredProjects.length > 0 && (
          <BreadcrumbNav
            projects={filteredProjects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
            currentPage="Visibility"
            showReportSelector={true}
            token={token}
            onReportSelect={setSelectedReport}
          />
        )}


        {/* Error State */}
        {(error || visibilityError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || visibilityError}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {(loading || loadingVisibility) && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Report Content */}
        {!loading && !loadingVisibility && selectedReport && visibilityData && (
          <div className="space-y-6 fade-in-section is-visible">
            <VisibilityAnalysis
              mentionRate={visibilityData.overallMentionRate}
              modeMetrics={visibilityData.modelVisibility}
              arenaData={visibilityData.arenaMetrics}
              brandName={selectedReport.brandName}
              selectedCompetitors={selectedCompetitors}
              onCompetitorToggle={(competitorName, checked) => {
                if (checked) {
                  setSelectedCompetitors((prev) => [...prev, competitorName]);
                } else {
                  setSelectedCompetitors((prev) =>
                    prev.filter((c) => c !== competitorName)
                  );
                }
              }}
            />
          </div>
        )}

        {/* No Reports State */}
        {!loading && !selectedReport && selectedProjectId && (
          <ProcessingLoader />
        )}
      </div>
  );
}
