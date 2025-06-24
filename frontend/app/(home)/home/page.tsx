"use client"

import { useNavigation } from "@/providers/navigation-provider"
import { Button } from "@/components/ui/button"
import { Plus, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import AddProjectModal from "@/components/AddProjectModal"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/providers/auth-provider"
import { createProjectFromUrl, ProjectResponse } from "@/lib/auth-api"
import { getMyOrganization, Organization } from "@/lib/organization-api"
import { useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { useAnalytics } from "@/hooks/use-analytics"
import { useCelebration } from "@/hooks/use-celebration"
import { CelebrationConfetti } from "@/components/ui/celebration-confetti"
import { ProjectOverviewCard } from "@/components/home/ProjectOverviewCard"
import { MintScoreCard } from "@/components/home/MintScoreCard"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function HomePage() {
  const { allProjects, setSelectedProject, selectedProject } = useNavigation()
  const { token } = useAuth()
  const router = useRouter()
  const analytics = useAnalytics()
  const shouldCelebrate = useCelebration()
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(false)

  // Show success toast when celebration is needed
  useEffect(() => {
    if (shouldCelebrate) {
      toast({
        title: "🎉 Congratulations!",
        description: "Your plan has been successfully activated. Welcome aboard!",
        duration: 10000,
      })
    }
  }, [shouldCelebrate])

  // Fetch organization to check plan limits
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!token) return
      try {
        const org = await getMyOrganization(token)
        setOrganization(org)
      } catch (error) {
        console.error("Failed to fetch organization:", error)
      }
    }
    fetchOrganization()
  }, [token])

  const handleProjectClick = (project: ProjectResponse) => {
    analytics.trackProjectViewed(project.id, project.brandName)
    setSelectedProject(project)
    router.push("/project-settings")
  }

  const handleGoToProject = (project: ProjectResponse) => {
    analytics.trackProjectViewed(project.id, project.brandName)
    setSelectedProject(project)
    // Store the selected project ID in localStorage
    localStorage.setItem('selectedProjectId', project.id)
    router.push("/visibility") // Navigate to the project dashboard
  }

  const handleAddProjectClick = () => {
    if (!organization) {
      setShowAddProjectModal(true)
      return
    }

    const currentProjectCount = allProjects.length
    const maxProjects = organization.planSettings?.maxProjects || 1

    console.log('Add project clicked:', {
      currentProjectCount,
      maxProjects,
      shouldRedirect: currentProjectCount >= maxProjects,
      planSettings: organization.planSettings
    })

    if (currentProjectCount >= maxProjects) {
      // Track upgrade intent
      analytics.track('project_limit_reached', {
        currentProjects: currentProjectCount,
        maxProjects: maxProjects,
        planName: organization.stripePlanId
      })
      // Redirect to update plan page
      router.push("/update-plan")
    } else {
      analytics.track('add_project_modal_opened')
      setShowAddProjectModal(true)
    }
  }


  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Projects</h1>
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-[200px] rounded-lg" />
              <Skeleton className="h-[200px] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <div className="flex gap-2">
          <Button onClick={handleAddProjectClick} size="default">
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
          <Button 
            onClick={() => router.push("/settings")} 
            size="default" 
            variant="outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Project Cards - One per row with two columns */}
        {allProjects.map((project) => (
          <div key={project.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProjectOverviewCard 
              project={project} 
              onClick={() => handleProjectClick(project)}
              onProjectSettings={() => handleProjectClick(project)}
            />
            <MintScoreCard 
              projectId={project.id} 
              token={token!} 
              onGoToProject={() => handleGoToProject(project)}
            />
          </div>
        ))}

      </div>

      {allProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No projects yet. Create your first project to get started.
          </p>
          <Button onClick={handleAddProjectClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Project
          </Button>
        </div>
      )}

      <AddProjectModal
        isOpen={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        onSuccess={(projectId) => {
          // Reload the page to refresh the project list
          window.location.reload()
        }}
        onCreateProject={async (data) => {
          if (!token) throw new Error("Not authenticated")
          const result = await createProjectFromUrl(data, token)
          return result
        }}
      />

      {/* Celebration confetti */}
      <CelebrationConfetti isActive={shouldCelebrate} />
    </div>
  )
}
