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
  getUserProjects,
  runManualAnalysis,
} from "@/lib/auth-api";
import { getMyOrganization } from "@/lib/organization-api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, RefreshCw, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { useNavigation } from "@/providers/navigation-provider";
import { useAnalytics } from "@/hooks/use-analytics";

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
  const analytics = useAnalytics();
  const { allProjects, selectedProject, setSelectedProject } = useNavigation();
  const [projectDetails, setProjectDetails] = useState<ProjectResponse | null>(null);
  const [promptSet, setPromptSet] = useState<PromptSet | null>(null);
  const [organization, setOrganization] = useState<any>(null);
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
        const [projectData, orgData] = await Promise.all([
          getProjectById(selectedProject.id, token),
          getMyOrganization(token)
        ]);
        setProjectDetails(projectData);
        setOrganization(orgData);
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
        description: (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <span>{result.message}</span>
          </div>
        ),
        duration: 8000,
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

  // Check if user is on free plan
  const isFreePlan = () => {
    if (!organization?.stripePlanId) return true; // Default to free if no plan info
    return organization.stripePlanId === 'free' || organization.stripePlanId.includes('free');
  };

  // Check if analysis is allowed based on rate limiting and plan
  const isAnalysisAllowed = () => {
    // Free plan users cannot run manual analysis
    if (isFreePlan()) return false;
    
    if (!projectDetails?.nextManualAnalysisAllowedAt) return true;
    const nextAllowedTime = new Date(projectDetails.nextManualAnalysisAllowedAt);
    const now = new Date();
    return now >= nextAllowedTime;
  };

  const getAnalysisDisabledReason = () => {
    // Check for free plan first
    if (isFreePlan()) {
      return "Manual refresh is only available for paid plans. Upgrade to unlock this feature.";
    }
    
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
      
      return `Next manual refresh will be available ${formattedTime}`;
    }
    
    return undefined;
  };

  return (
    <div className="space-y-6">
        {/* Breadcrumb Navigation and Manual Refresh Button */}
        {token && allProjects.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <BreadcrumbNav
              projects={allProjects}
              selectedProject={selectedProject}
              onProjectSelect={setSelectedProject}
              currentPage="Project Settings"
              showReportSelector={false}
            />
            
            {/* Manual Refresh Button */}
            {projectDetails && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex">
                      <Button
                        onClick={handleRunAnalysis}
                        disabled={!isAnalysisAllowed() || runningAnalysis}
                        variant="default"
                        size="default"
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${runningAnalysis ? 'animate-spin' : ''}`} />
                        {runningAnalysis ? "Refreshing..." : "Manual Refresh"}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    {(!isAnalysisAllowed() || runningAnalysis) ? (
                      <div>
                        <p>{runningAnalysis ? "Analysis in progress..." : getAnalysisDisabledReason()}</p>
                        {isFreePlan() && !runningAnalysis && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 h-auto mt-1 text-blue-600"
                            onClick={() => router.push('/update-plan')}
                          >
                            Upgrade Now →
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p>Click to run manual analysis</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">Visibility</h2>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Track your organic visibility and brand mentions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
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
                        projectId={projectDetails.id}
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
                        maxPrompts={organization?.planSettings?.maxSpontaneousPrompts || 12}
                        maxSpontaneousPrompts={organization?.planSettings?.maxSpontaneousPrompts}
                        onAddClick={() => router.push("/update-plan")}
                        onRegenerateComplete={async () => {
                          // Refresh the prompt set after regeneration
                          if (token) {
                            try {
                              const refreshedPrompts = await getPromptSet(projectDetails.id, token);
                              setPromptSet(refreshedPrompts);
                            } catch (error) {
                              console.error("Failed to refresh prompts:", error);
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </Card>

              {/* Row 2: Alignment */}
              <Card className="p-6">
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">Alignment</h2>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Verify that AI accurately portrays your key differentiators, information, and positioning</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
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
                        projectId={projectDetails.id}
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">Sentiment</h2>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Discover how AI perceives your brand and track shifts over time</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="col-span-5">
                    {/* Empty column */}
                  </div>
                  <div className="col-span-5">
                    {promptSet && (
                      <PromptsDisplay
                        prompts={promptSet.sentiment || []}
                        type="sentiment"
                        projectId={projectDetails.id}
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
