"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, RefreshCw, Settings } from "lucide-react"
import { ProjectResponse } from "@/lib/auth-api"
import { useEffect, useState } from "react"
import { getProjectReports } from "@/lib/api/report"
import { useAuth } from "@/providers/auth-provider"
import { useNotificationContext } from "@/providers/notification-provider"
import { useFavicon } from "@/hooks/use-favicon"

interface ProjectOverviewCardProps {
  project: ProjectResponse
  onClick: () => void
  onGoToProject?: () => void
  onProjectSettings?: () => void
}

export function ProjectOverviewCard({ project, onClick, onGoToProject, onProjectSettings }: ProjectOverviewCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { token } = useAuth()
  const { notifications } = useNotificationContext()
  
  // Get favicon from project URL
  const { faviconUrl } = useFavicon(project.url)

  useEffect(() => {
    const checkProcessingStatus = async () => {
      if (!token) return
      
      try {
        const reports = await getProjectReports(project.id, token)
        
        if (reports.length === 0) {
          // No reports yet, likely processing
          setIsProcessing(true)
        } else {
          // Check if latest report is very recent (< 10 mins)
          const latestReport = reports.sort((a, b) => 
            new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
          )[0]
          const reportAge = Date.now() - new Date(latestReport.generatedAt).getTime()
          const tenMinutes = 10 * 60 * 1000
          setIsProcessing(reportAge < tenMinutes)
        }
      } catch (error) {
        console.error("Failed to check processing status:", error)
      }
    }

    checkProcessingStatus()
  }, [project.id, token])

  // Listen for notifications
  useEffect(() => {
    const recentNotification = notifications.find(
      n => n.projectId === project.id && 
      (Date.now() - new Date(n.timestamp).getTime() < 5 * 60 * 1000)
    )
    if (recentNotification) {
      setIsProcessing(false)
    }
  }, [notifications, project.id])
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow relative flex flex-col h-full"
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          {faviconUrl && (
            <img 
              src={faviconUrl}
              alt={`${project.brandName} favicon`}
              className="h-5 w-5"
            />
          )}
          {project.name || project.brandName}
        </CardTitle>
        <CardDescription className="flex items-center gap-2 text-sm">
          <ExternalLink className="h-3 w-3" />
          {project.url}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1">
          {project.objectives && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Objectives</h4>
              <p className="text-sm line-clamp-2">{project.objectives}</p>
            </div>
          )}
        </div>
        
        {/* Project Settings Button */}
        {onProjectSettings && (
          <div className="pt-3 mt-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full" 
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                onProjectSettings();
              }}
            >
              <Settings className="h-3 w-3 mr-2" />
              Project Settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}