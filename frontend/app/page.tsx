"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useAuth } from "@/providers/auth-provider";
import {
  getProjectById,
  getPromptSet,
  updateProject,
  ProjectResponse,
  PromptSet,
} from "@/lib/auth-api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Import component modules
import { ProjectHeader } from "@/components/project-profile/ProjectHeader";
import { AttributesCard } from "@/components/project-profile/AttributesCard";
import { CompetitorsCard } from "@/components/project-profile/CompetitorsCard";
import { PromptsPortfolio } from "@/components/project-profile/PromptsPortfolio";
import { ProjectMetadata } from "@/components/project-profile/ProjectMetadata";
import { EditAttributesDialog } from "@/components/project-profile/EditAttributesDialog";
import { EditCompetitorsDialog } from "@/components/project-profile/EditCompetitorsDialog";

export default function Home() {
  const { token } = useAuth();
  const [selectedProject, setSelectedProject] =
    useState<ProjectResponse | null>(null);
  const [promptSet, setPromptSet] = useState<PromptSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Modal states
  const [editAttributesOpen, setEditAttributesOpen] = useState(false);
  const [editCompetitorsOpen, setEditCompetitorsOpen] = useState(false);

  // Get selected project from localStorage or dashboard context
  useEffect(() => {
    const fetchProjectDetails = async () => {
      const selectedProjectId = localStorage.getItem("selectedProjectId");

      if (!selectedProjectId || !token) {
        setSelectedProject(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        const projectData = await getProjectById(selectedProjectId, token);
        setSelectedProject(projectData);
        setError(null);

        // Fetch prompt set
        setLoadingPrompts(true);
        try {
          const prompts = await getPromptSet(selectedProjectId, token);
          setPromptSet(prompts);
        } catch (promptErr) {
          console.error("Failed to fetch prompt set:", promptErr);
          // Don't set error for prompt set, it's optional
          setPromptSet(null);
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

    // Listen for storage changes to update when project selection changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedProjectId" && e.newValue) {
        fetchProjectDetails();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom events for same-tab updates
    const handleProjectChange = () => {
      fetchProjectDetails();
    };

    window.addEventListener("projectSelectionChanged", handleProjectChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "projectSelectionChanged",
        handleProjectChange
      );
    };
  }, [token]);

  const handleSaveAttributes = async (attributes: string[]) => {
    if (!selectedProject || !token) return;
    const updatedCard = await updateProject(
      selectedProject.id,
      { keyBrandAttributes: attributes },
      token
    );
    setSelectedProject(updatedCard);
  };

  const handleSaveCompetitors = async (competitors: string[]) => {
    if (!selectedProject || !token) return;
    const updatedCard = await updateProject(
      selectedProject.id,
      { competitors },
      token
    );
    setSelectedProject(updatedCard);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Project Profile
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage your project's brand identity information
          </p>
        </div>

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

        {!loading && !error && !selectedProject && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a project from the sidebar to view its profile.
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && selectedProject && (
          <div className="space-y-6">
            {/* Project Header */}
            <ProjectHeader
              project={selectedProject}
              isDescriptionExpanded={isDescriptionExpanded}
              setIsDescriptionExpanded={setIsDescriptionExpanded}
            />

            {/* Key Brand Attributes and Competitors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AttributesCard
                project={selectedProject}
                onEdit={() => setEditAttributesOpen(true)}
              />
              <CompetitorsCard
                project={selectedProject}
                onEdit={() => setEditCompetitorsOpen(true)}
              />
            </div>

            {/* Prompts Section */}
            {promptSet && (
              <PromptsPortfolio
                promptSet={promptSet}
                projectId={selectedProject.id}
                token={token}
                onUpdate={setPromptSet}
              />
            )}

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
            <ProjectMetadata project={selectedProject} />
          </div>
        )}

        {/* Edit Modals */}
        {selectedProject && (
          <>
            <EditAttributesDialog
              open={editAttributesOpen}
              onOpenChange={setEditAttributesOpen}
              attributes={selectedProject.keyBrandAttributes}
              brandName={selectedProject.brandName}
              onSave={handleSaveAttributes}
            />

            <EditCompetitorsDialog
              open={editCompetitorsOpen}
              onOpenChange={setEditCompetitorsOpen}
              competitors={selectedProject.competitors}
              brandName={selectedProject.brandName}
              onSave={handleSaveCompetitors}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
