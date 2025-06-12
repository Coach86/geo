"use client"

import { useNavigation } from "@/providers/navigation-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, BarChart3, Globe, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import AddProjectModal from "@/components/AddProjectModal"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/providers/auth-provider"
import { createProjectFromUrl, ProjectResponse, runManualAnalysis, getProjectById } from "@/lib/auth-api"
import { getMyOrganization, Organization } from "@/lib/organization-api"
import { useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { useAnalytics } from "@/hooks/use-analytics"

export default function HomePage() {
  const { filteredProjects, allProjects, setSelectedProject } = useNavigation()
  const { token } = useAuth()
  const router = useRouter()
  const analytics = useAnalytics()
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(false)
  const [runningAnalysis, setRunningAnalysis] = useState<string[]>([]) // Track which projects are running analysis

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

  // Check if analysis is allowed based on rate limiting
  const isAnalysisAllowed = (project: ProjectResponse) => {
    if (!project.nextManualAnalysisAllowedAt) return true
    const nextAllowedTime = new Date(project.nextManualAnalysisAllowedAt)
    const now = new Date()
    return now >= nextAllowedTime
  }

  const getAnalysisDisabledReason = (project: ProjectResponse) => {
    if (!project.nextManualAnalysisAllowedAt) return undefined
    
    const nextAllowedTime = new Date(project.nextManualAnalysisAllowedAt)
    const now = new Date()
    
    if (now < nextAllowedTime) {
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }
      const formattedTime = nextAllowedTime.toLocaleDateString('en-US', dateOptions)
      
      return `Manual refresh will be available ${formattedTime}`
    }
    
    return undefined
  }

  const handleRunAnalysis = async (e: React.MouseEvent, project: ProjectResponse) => {
    e.stopPropagation() // Prevent card click navigation
    
    if (!token || runningAnalysis.includes(project.id)) return

    // Check if analysis is allowed before making the API call
    if (!isAnalysisAllowed(project)) {
      const reason = getAnalysisDisabledReason(project)
      toast({
        title: "Manual Refresh Not Available",
        description: reason || "Manual refresh is currently not available",
        variant: "warning" as any,
        duration: 6000,
      })
      return
    }

    try {
      setRunningAnalysis(prev => [...prev, project.id])
      analytics.trackManualRefresh(project.id, project.brandName)
      
      const result = await runManualAnalysis(project.id, token)
      
      toast({
        title: "Manual Refresh Started",
        description: "This process usually takes 5-10 minutes to complete. Please check back later for results.",
        duration: 6000,
      })

      // Refresh the project in the list to get updated nextManualAnalysisAllowedAt
      const updatedProject = await getProjectById(project.id, token)
      // Update the project in navigation context if possible
      
    } catch (error) {
      console.error("Failed to run analysis:", error)
      
      // Check if it's a rate limit error
      const errorMessage = error instanceof Error ? error.message : "Failed to start manual refresh"
      const isRateLimitError = errorMessage.includes("will be available")
      
      toast({
        title: isRateLimitError ? "Manual Refresh Not Available" : "Manual Refresh Failed",
        description: errorMessage,
        variant: isRateLimitError ? ("warning" as any) : "destructive",
        duration: 6000,
      })
    } finally {
      setRunningAnalysis(prev => prev.filter(id => id !== project.id))
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Projects</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-[200px]">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <div className="text-sm text-muted-foreground">
          {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Project Cards */}
        {filteredProjects.map((project) => (
          <Card 
            key={project.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleProjectClick(project)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-1">
                    {project.name || project.brandName}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <Globe className="h-3 w-3" />
                    {project.market}
                    {project.language && ` • ${project.language}`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {project.shortDescription}
              </p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  <span>{project.keyBrandAttributes?.length || 0} attributes</span>
                </div>
                
                {project.generatedAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(project.generatedAt), { 
                        addSuffix: true 
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Run Analysis Button */}
              <div className="flex justify-end">
                <Button
                  onClick={(e) => handleRunAnalysis(e, project)}
                  disabled={!isAnalysisAllowed(project) || runningAnalysis.includes(project.id)}
                  variant="default"
                  size="sm"
                  className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white"
                  title={runningAnalysis.includes(project.id) ? "Refresh in progress..." : getAnalysisDisabledReason(project)}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  {runningAnalysis.includes(project.id) ? "Refreshing..." : "Manual Refresh"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add Project Card - at the end */}
        <Card 
          className="border-dashed cursor-pointer hover:bg-accent/50 transition-colors flex items-center justify-center min-h-[200px]"
          onClick={handleAddProjectClick}
        >
          <div className="text-center">
            <Plus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Add New Project</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new brand analysis project
            </p>
          </div>
        </Card>
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No projects found for the selected domain.
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
    </div>
  )
}