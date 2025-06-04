"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  getReportSpontaneous,
  SpontaneousData,
} from "@/lib/auth-api";
import type { ReportResponse } from "@/types/reports";
import { VisibilityAnalysis } from "@/components/visibility/VisibilityAnalysis";
import { TopMentions } from "@/components/visibility/TopMentions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ReportSelector } from "@/components/shared/ReportSelector";
import { useReportData } from "@/hooks/use-report-data";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { useNavigation } from "@/providers/navigation-provider";

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
  topMentions: {
    mention: string;
    count: number;
  }[];
  spontaneousData?: SpontaneousData; // Store the full spontaneous data if available
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
      topMentions: [],
      spontaneousData: reportData.spontaneous,
    };
  });

  const [spontaneousData, setSpontaneousData] = useState<SpontaneousData | null>(null);
  const [loadingSpontaneous, setLoadingSpontaneous] = useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);

  // Fetch spontaneous data when selected report changes
  useEffect(() => {
    const fetchSpontaneous = async () => {
      if (!selectedReport || !token) {
        setSpontaneousData(null);
        return;
      }

      setLoadingSpontaneous(true);
      try {
        const data = await getReportSpontaneous(selectedReport.id, token);
        setSpontaneousData(data);
      } catch (err) {
        console.error("Failed to fetch spontaneous data:", err);
        // Don't show error for spontaneous data, just log it
        setSpontaneousData(null);
      } finally {
        setLoadingSpontaneous(false);
      }
    };

    fetchSpontaneous();
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
                brandName: reportData.brand || (report.metadata as any)?.brand || projectDetails.brandName,
                topMentions: [],
                spontaneousData: reportData.spontaneous,
              };
              setSelectedReport(processedReport);
            }}
          />
        )}


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
        {!loading && selectedReport && (
          <div className="space-y-6 fade-in-section is-visible">
            {/* Competitor Selection */}
            {selectedReport.arenaData &&
              selectedReport.arenaData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-dark-700">
                      Select Competitors to Compare
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Choose which competitors to display in the analysis
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4">
                      {selectedReport.arenaData
                        .filter(
                          (comp) =>
                            comp.name.toLowerCase() !==
                            selectedReport.brandName.toLowerCase()
                        )
                        .map((competitor) => (
                          <div
                            key={competitor.name}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={competitor.name}
                              checked={selectedCompetitors.includes(
                                competitor.name
                              )}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCompetitors((prev) => [
                                    ...prev,
                                    competitor.name,
                                  ]);
                                } else {
                                  setSelectedCompetitors((prev) =>
                                    prev.filter((c) => c !== competitor.name)
                                  );
                                }
                              }}
                            />
                            <Label
                              htmlFor={competitor.name}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {competitor.name}
                            </Label>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            <VisibilityAnalysis
              mentionRate={selectedReport.mentionRate}
              modeMetrics={selectedReport.modeMetrics}
              arenaData={selectedReport.arenaData}
              brandName={selectedReport.brandName}
              selectedCompetitors={selectedCompetitors}
            />

            <TopMentions
              spontaneousData={spontaneousData}
              loadingSpontaneous={loadingSpontaneous}
            />
          </div>
        )}

        {/* No Reports State */}
        {!loading && !selectedReport && selectedProjectId && (
          <Card>
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No visibility reports available yet. Reports are generated
                  weekly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
