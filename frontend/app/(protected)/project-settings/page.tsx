"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import {
  getProjectById,
  getPromptSet,
  updateProject,
  updatePromptSet,
  ProjectResponse,
  PromptSet,
  getUserProfile,
  getUserProjects,
  runManualAnalysis,
} from "@/lib/auth-api";
import { getMyOrganization } from "@/lib/organization-api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { useNavigation } from "@/providers/navigation-provider";

// Import component modules
import { ProjectHeader } from "@/components/project-profile/ProjectHeader";
import { AttributesList } from "@/components/project-profile/AttributesList";
import { CompetitorsList } from "@/components/project-profile/CompetitorsList";
import { PromptsDisplay } from "@/components/project-profile/PromptsDisplay";
import { ProjectMetadata } from "@/components/project-profile/ProjectMetadata";
import { EditAttributesDialog } from "@/components/project-profile/EditAttributesDialog";
import { EditCompetitorsDialog } from "@/components/project-profile/EditCompetitorsDialog";
import { EditProjectNameDialog } from "@/components/project-profile/EditProjectNameDialog";
import { EditObjectivesDialog } from "@/components/project-profile/EditObjectivesDialog";

export default function Home() {
  const { token } = useAuth();
  const router = useRouter();
  const { filteredProjects, selectedProject, setSelectedProject } = useNavigation();
  const [projectDetails, setProjectDetails] = useState<ProjectResponse | null>(null);
  const [promptSet, setPromptSet] = useState<PromptSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Modal states
  const [editAttributesOpen, setEditAttributesOpen] = useState(false);
  const [editCompetitorsOpen, setEditCompetitorsOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editObjectivesOpen, setEditObjectivesOpen] = useState(false);

  // Analysis states
  const [runningAnalysis, setRunningAnalysis] = useState(false);

  // Fetch project details when selected project changes
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!selectedProject || !token) {
        setProjectDetails(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        const projectData = await getProjectById(selectedProject.id, token);
        setProjectDetails(projectData);
        setError(null);

        // Fetch prompt set with retry logic
        setLoadingPrompts(true);
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 2000; // 2 seconds

        const fetchPromptsWithRetry = async () => {
          while (retryCount < maxRetries) {
            try {
              console.log(`[Profile] Fetching prompt set for project: ${selectedProject.id} (attempt ${retryCount + 1}/${maxRetries})`);
              const prompts = await getPromptSet(selectedProject.id, token);
              console.log('[Profile] Received prompt set:', prompts);
              setPromptSet(prompts);
              return; // Success, exit the retry loop
            } catch (promptErr: any) {
              console.error(`[Profile] Failed to fetch prompt set (attempt ${retryCount + 1}):`, promptErr);
              console.error("[Profile] Error details:", JSON.stringify(promptErr, null, 2));
              
              // Check if it's a 404 (prompt set not found yet)
              if (promptErr?.response?.status === 404 && retryCount < maxRetries - 1) {
                console.log(`[Profile] Prompt set not found yet, retrying in ${retryDelay}ms...`);
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              } else {
                // Don't set error for prompt set, it's optional
                console.log('[Profile] Giving up on fetching prompt set');
                setPromptSet(null);
                break;
              }
            }
          }
        };

        try {
          await fetchPromptsWithRetry();
        } finally {
          setLoadingPrompts(false);
        }
      } catch (err) {
        console.error("Failed to fetch project details:", err);
        setError("Failed to load project details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [selectedProject, token]);

  // Remove the manual check as ProtectedLayout handles it now

  const handleSaveAttributes = async (attributes: string[]) => {
    if (!projectDetails || !token) return;
    const updatedCard = await updateProject(
      projectDetails.id,
      { keyBrandAttributes: attributes },
      token
    );
    setProjectDetails(updatedCard);
  };

  const handleSaveCompetitors = async (competitors: string[]) => {
    if (!projectDetails || !token) return;
    const updatedCard = await updateProject(
      projectDetails.id,
      { competitors },
      token
    );
    setProjectDetails(updatedCard);
  };

  const handleSaveName = async (name: string) => {
    if (!projectDetails || !token) return;
    const updatedCard = await updateProject(
      projectDetails.id,
      { name },
      token
    );
    setProjectDetails(updatedCard);
  };

  const handleSaveObjectives = async (objectives: string) => {
    if (!projectDetails || !token) return;
    const updatedCard = await updateProject(
      projectDetails.id,
      { objectives },
      token
    );
    setProjectDetails(updatedCard);
  };

  const handleRunAnalysis = async () => {
    if (!projectDetails || !token || runningAnalysis) return;

    // Check if analysis is allowed before making the API call
    if (!isAnalysisAllowed()) {
      const reason = getAnalysisDisabledReason();
      toast({
        title: "Analysis Not Available",
        description: reason || "Analysis is currently not available",
        variant: "warning" as any,
        duration: 6000,
      });
      return;
    }

    try {
      setRunningAnalysis(true);
      const result = await runManualAnalysis(projectDetails.id, token);
      
      toast({
        title: "Analysis Started",
        description: result.message,
        duration: 6000,
      });

      // Refresh project details to get updated nextManualAnalysisAllowedAt
      const updatedProject = await getProjectById(projectDetails.id, token);
      setProjectDetails(updatedProject);
      
    } catch (error) {
      console.error("Failed to run analysis:", error);
      
      // Check if it's a rate limit error (403)
      const errorMessage = error instanceof Error ? error.message : "Failed to start analysis";
      const isRateLimitError = errorMessage.includes("Analysis will be available");
      
      toast({
        title: isRateLimitError ? "Analysis Not Available" : "Analysis Failed",
        description: errorMessage,
        variant: isRateLimitError ? ("warning" as any) : "destructive",
        duration: 6000,
      });
    } finally {
      setRunningAnalysis(false);
    }
  };

  // Check if analysis is allowed based on rate limiting
  const isAnalysisAllowed = () => {
    if (!projectDetails?.nextManualAnalysisAllowedAt) return true;
    const nextAllowedTime = new Date(projectDetails.nextManualAnalysisAllowedAt);
    const now = new Date();
    return now >= nextAllowedTime;
  };

  const getAnalysisDisabledReason = () => {
    if (!projectDetails?.nextManualAnalysisAllowedAt) return undefined;
    
    const nextAllowedTime = new Date(projectDetails.nextManualAnalysisAllowedAt);
    const now = new Date();
    
    if (now < nextAllowedTime) {
      // Format the date and time when analysis will be available
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      const formattedTime = nextAllowedTime.toLocaleDateString('en-US', dateOptions);
      
      return `Analysis will be available ${formattedTime}`;
    }
    
    return undefined;
  };

  return (
    <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        {token && filteredProjects.length > 0 && (
          <BreadcrumbNav
            projects={filteredProjects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
            currentPage="Profile"
            showReportSelector={false}
          />
        )}


        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && !projectDetails && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a project from the sidebar to view its profile.
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && projectDetails && (
          <div className="space-y-6">
            {/* Project Header */}
            <ProjectHeader
              project={projectDetails}
              isDescriptionExpanded={isDescriptionExpanded}
              setIsDescriptionExpanded={setIsDescriptionExpanded}
              onEditName={() => setEditNameOpen(true)}
              onEditObjectives={() => setEditObjectivesOpen(true)}
            />

            {/* 3-Column Grid Layout */}
            <div className="space-y-6">
              {/* Row 1: Visibility */}
              <Card className="p-6">
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-2">
                    <h2 className="text-lg font-semibold text-gray-900">Visibility</h2>
                  </div>
                  <div className="col-span-5">
                    <CompetitorsList
                      project={projectDetails}
                      onEdit={() => setEditCompetitorsOpen(true)}
                      onUpdate={async (competitors) => {
                        if (token) {
                          const updated = await updateProject(
                            projectDetails.id,
                            { competitors },
                            token
                          );
                          setProjectDetails(updated);
                        }
                      }}
                    />
                  </div>
                  <div className="col-span-5">
                    {promptSet && (
                      <PromptsDisplay
                        prompts={promptSet.visibility || []}
                        type="visibility"
                        onUpdate={async (updatedPrompts) => {
                          const updatedSet = { ...promptSet, visibility: updatedPrompts };
                          setPromptSet(updatedSet);
                          if (token) {
                            try {
                              await updatePromptSet(
                                projectDetails.id,
                                {
                                  visibility: updatedSet.visibility,
                                  sentiment: updatedSet.sentiment,
                                  alignment: updatedSet.alignment,
                                  competition: updatedSet.competition,
                                },
                                token
                              );
                            } catch (error) {
                              console.error("Failed to update prompts:", error);
                            }
                          }
                        }}
                        canAdd={true}
                        maxPrompts={12} // TODO: Get from user profile
                        onAddClick={() => router.push("/update-plan")}
                      />
                    )}
                  </div>
                </div>
              </Card>

              {/* Row 2: Alignment */}
              <Card className="p-6">
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-2">
                    <h2 className="text-lg font-semibold text-gray-900">Alignment</h2>
                  </div>
                  <div className="col-span-5">
                    <AttributesList
                      project={projectDetails}
                      onEdit={() => setEditAttributesOpen(true)}
                      onUpdate={async (keyBrandAttributes) => {
                        if (token) {
                          const updated = await updateProject(
                            projectDetails.id,
                            { keyBrandAttributes },
                            token
                          );
                          setProjectDetails(updated);
                        }
                      }}
                    />
                  </div>
                  <div className="col-span-5">
                    {promptSet && (
                      <PromptsDisplay
                        prompts={promptSet.alignment || []}
                        type="alignment"
                        onUpdate={async (updatedPrompts) => {
                          const updatedSet = { ...promptSet, alignment: updatedPrompts };
                          setPromptSet(updatedSet);
                          if (token) {
                            try {
                              await updatePromptSet(
                                projectDetails.id,
                                {
                                  visibility: updatedSet.visibility,
                                  sentiment: updatedSet.sentiment,
                                  alignment: updatedSet.alignment,
                                  competition: updatedSet.competition,
                                },
                                token
                              );
                            } catch (error) {
                              console.error("Failed to update prompts:", error);
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </Card>

              {/* Row 3: Sentiment */}
              <Card className="p-6">
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-2">
                    <h2 className="text-lg font-semibold text-gray-900">Sentiment</h2>
                  </div>
                  <div className="col-span-5">
                    {/* Empty column */}
                  </div>
                  <div className="col-span-5">
                    {promptSet && (
                      <PromptsDisplay
                        prompts={promptSet.sentiment || []}
                        type="sentiment"
                        onUpdate={async (updatedPrompts) => {
                          const updatedSet = { ...promptSet, sentiment: updatedPrompts };
                          setPromptSet(updatedSet);
                          if (token) {
                            try {
                              await updatePromptSet(
                                projectDetails.id,
                                {
                                  visibility: updatedSet.visibility,
                                  sentiment: updatedSet.sentiment,
                                  alignment: updatedSet.alignment,
                                  competition: updatedSet.competition,
                                },
                                token
                              );
                            } catch (error) {
                              console.error("Failed to update prompts:", error);
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Loading state for prompts */}
            {loadingPrompts && (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="text-sm text-gray-600">
                      Loading prompts...
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Metadata */}
            <ProjectMetadata 
              project={projectDetails}
              onRunAnalysis={handleRunAnalysis}
              isAnalysisAllowed={isAnalysisAllowed() && !runningAnalysis}
              analysisDisabledReason={runningAnalysis ? "Analysis in progress..." : getAnalysisDisabledReason()}
              runningAnalysis={runningAnalysis}
            />
          </div>
        )}

        {/* Edit Modals */}
        {projectDetails && (
          <>
            <EditProjectNameDialog
              open={editNameOpen}
              onOpenChange={setEditNameOpen}
              currentName={projectDetails.name}
              brandName={projectDetails.brandName}
              onSave={handleSaveName}
            />

            <EditAttributesDialog
              open={editAttributesOpen}
              onOpenChange={setEditAttributesOpen}
              attributes={projectDetails.keyBrandAttributes}
              brandName={projectDetails.brandName}
              onSave={handleSaveAttributes}
            />

            <EditCompetitorsDialog
              open={editCompetitorsOpen}
              onOpenChange={setEditCompetitorsOpen}
              competitors={projectDetails.competitors}
              brandName={projectDetails.brandName}
              onSave={handleSaveCompetitors}
            />

            <EditObjectivesDialog
              open={editObjectivesOpen}
              onOpenChange={setEditObjectivesOpen}
              currentObjectives={projectDetails.objectives}
              brandName={projectDetails.brandName}
              onSave={handleSaveObjectives}
            />
          </>
        )}
      </div>
  );
}
