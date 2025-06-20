"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, Calendar, BarChart3, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ProjectResponse } from "@/lib/auth-api"
import { useEffect, useState } from "react"
import { getProjectReports } from "@/lib/api/report"
import { useAuth } from "@/providers/auth-provider"
import { useNotificationContext } from "@/providers/notification-provider"

interface ProjectOverviewCardProps {
  project: ProjectResponse
  onClick: () => void
}

export function ProjectOverviewCard({ project, onClick }: ProjectOverviewCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { token } = useAuth()
  const { notifications } = useNotificationContext()

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
      className="cursor-pointer hover:shadow-lg transition-shadow relative"
      onClick={onClick}
    >
      {isProcessing && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Analyzing</span>
          </div>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl mb-2">
          {project.name || project.brandName}
        </CardTitle>
        <CardDescription className="flex items-center gap-2 text-sm">
          <Globe className="h-3 w-3" />
          {project.url}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {project.objectives && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Objectives</h4>
              <p className="text-sm line-clamp-2">{project.objectives}</p>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              <span>{project.keyBrandAttributes?.length || 0} attributes</span>
            </div>
            {project.updatedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  Updated {formatDistanceToNow(new Date(project.updatedAt), {
                    addSuffix: true
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}