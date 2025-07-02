"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, Heart, Shield, ArrowRight, Lock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getProjectReports, getReportVisibility, getReportSentiment, getReportAlignment } from "@/lib/api/report"
import { RefreshCw, Info } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useNotificationContext } from "@/providers/notification-provider"
import { useBatchEventsContext } from "@/providers/batch-events-provider"
import { useRouter } from "next/navigation"
import { useFeatureAccess } from "@/hooks/use-feature-access"
import { useProjectBatchStatus } from "@/hooks/use-project-batch-status"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface MintScoreCardProps {
  projectId: string
  token: string
  onGoToProject?: () => void
}

interface ScoreData {
  visibility: number | null
  sentiment: {
    score: number
    sentiment: string
  } | null
  alignment: {
    score: number
  } | null
  loading: boolean
  hasData: boolean
  mintScore: number | null
  reportDate: Date | null
}

export function MintScoreCard({ projectId, token, onGoToProject }: MintScoreCardProps) {
  const [scores, setScores] = useState<ScoreData>({
    visibility: null,
    sentiment: null,
    alignment: null,
    loading: true,
    hasData: false,
    mintScore: null,
    reportDate: null
  })
  const { notifications } = useNotificationContext()
  const { isProcessing: isBatchProcessing, getBatchStatus, getProgress } = useBatchEventsContext()
  const { isRunning: isBatchRunning } = useProjectBatchStatus(projectId, token)
  const router = useRouter()
  const featureAccess = useFeatureAccess()

  useEffect(() => {
    const fetchLatestScores = async () => {
      try {
        const reports = await getProjectReports(projectId, token)
        
        if (reports.length > 0) {
          // Get the latest report
          const latestReport = reports.sort((a, b) => 
            new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
          )[0]

          // Batch processing status is now handled by the hook

          // Fetch detailed data for each section
          const [visibilityData, sentimentData, alignmentData] = await Promise.all([
            getReportVisibility(latestReport.id, token),
            getReportSentiment(latestReport.id, token),
            getReportAlignment(latestReport.id, token)
          ])

          const vis = visibilityData?.overallMentionRate || null
          const sent = sentimentData?.overallScore || null
          const align = alignmentData?.summary?.overallAlignmentScore || null
          
          const mintScore = (vis !== null && sent !== null && align !== null) 
            ? calculateMintScore(vis, sent, align)
            : null

          setScores({
            visibility: vis,
            sentiment: sentimentData?.overallScore !== undefined ? {
              score: sentimentData.overallScore,
              sentiment: sentimentData.overallSentiment
            } : null,
            alignment: align !== null ? {
              score: align
            } : null,
            loading: false,
            hasData: true,
            mintScore,
            reportDate: new Date(latestReport.generatedAt)
          })
        } else {
          // No reports yet
          setScores(prev => ({ ...prev, loading: false, hasData: false, mintScore: null }))
        }
      } catch (error) {
        console.error("Failed to fetch scores:", error)
        setScores(prev => ({ ...prev, loading: false, hasData: false, mintScore: null }))
      }
    }

    fetchLatestScores()
  }, [projectId, token])

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'text-green-600 bg-green-50'
      case 'neutral':
        return 'text-yellow-600 bg-yellow-50'
      case 'negative':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getAlignmentColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Calculate Mint Score using weighted average
  const calculateMintScore = (visibility: number, sentiment: number, alignment: number): number => {
    // Weighted calculation:
    // - Visibility: 2x weight
    // - Sentiment: 1x weight  
    // - Alignment: 1x weight
    // Formula: (2 * visibility + sentiment + alignment) / 4
    const weightedScore = (2 * visibility + sentiment + alignment) / 4
    
    return Math.round(weightedScore)
  }

  const getMintScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    if (score >= 40) return 'text-orange-600 bg-orange-50'
    if (score >= 20) return 'text-red-500 bg-red-50'
    return 'text-red-700 bg-red-100'
  }

  const getMintScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Medium'
    if (score >= 20) return 'Low'
    return 'Critical'
  }

  // Listen for notifications for this project
  useEffect(() => {
    const recentNotification = notifications.find(
      n => n.projectId === projectId && 
      (Date.now() - new Date(n.timestamp).getTime() < 5 * 60 * 1000) // 5 minutes
    )
    if (recentNotification) {
      // Refetch scores when a notification is received
      const fetchLatestScores = async () => {
        try {
          const reports = await getProjectReports(projectId, token)
          if (reports.length > 0) {
            const latestReport = reports.sort((a, b) => 
              new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
            )[0]
            const [visibilityData, sentimentData, alignmentData] = await Promise.all([
              getReportVisibility(latestReport.id, token),
              getReportSentiment(latestReport.id, token),
              getReportAlignment(latestReport.id, token)
            ])
            const vis = visibilityData?.overallMentionRate || null
            const sent = sentimentData?.overallScore || null
            const align = alignmentData?.summary?.overallAlignmentScore || null
            
            const mintScore = (vis !== null && sent !== null && align !== null) 
              ? calculateMintScore(vis, sent, align)
              : null

            setScores({
              visibility: vis,
              sentiment: sentimentData?.overallScore !== undefined ? {
                score: sentimentData.overallScore,
                sentiment: sentimentData.overallSentiment
              } : null,
              alignment: align !== null ? {
                score: align
              } : null,
              loading: false,
              hasData: true,
              mintScore,
              reportDate: new Date(latestReport.generatedAt)
            })
          }
        } catch (error) {
          console.error("Failed to fetch updated scores:", error)
        }
      }
      fetchLatestScores()
    }
  }, [notifications, projectId, token])

  const handleCardClick = () => {
    if (onGoToProject) {
      onGoToProject();
    }
  };

  const handleUnlockClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    router.push('/update-plan');
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow relative flex flex-col h-full cursor-pointer" 
      onClick={handleCardClick}
    >
      {isBatchRunning && (
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Analyzing</span>
          </div>
        </div>
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Mint Score</CardTitle>
            <CardDescription>
              {scores.reportDate 
                ? `Updated ${formatDistanceToNow(scores.reportDate, { addSuffix: true })}`
                : 'No analysis yet'
              }
            </CardDescription>
          </div>
          {featureAccess.isFreePlan ? (
            <Badge 
              variant="secondary" 
              className="px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800"
              onClick={handleUnlockClick}
            >
              Unlock
            </Badge>
          ) : scores.mintScore !== null && (
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getMintScoreColor(scores.mintScore).split(' ')[0]}`}>
                {scores.mintScore}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-semibold">Mint Score Calculation:</p>
                      <p className="text-sm">
                        (2 × Visibility + Sentiment + Alignment) ÷ 4
                      </p>
                      <ul className="text-sm space-y-1 mt-2">
                        <li>• 80-100: Excellent (Green)</li>
                        <li>• 60-80: Good (Yellow)</li>
                        <li>• 40-60: Medium (Orange)</li>
                        <li>• 20-40: Low (Light Red)</li>
                        <li>• 0-20: Critical (Strong Red)</li>
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-4 flex-1">
          {/* Visibility Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Visibility</span>
            </div>
            {scores.loading ? (
              <Skeleton className="h-5 w-16" />
            ) : scores.visibility !== null ? (
              <span className="text-sm font-semibold">{Math.round(scores.visibility)}%</span>
            ) : (
              <span className="text-sm text-muted-foreground">{isBatchRunning ? "Processing..." : scores.hasData ? "--" : "No data"}</span>
            )}
          </div>

          {/* Sentiment Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sentiment</span>
            </div>
            {scores.loading ? (
              <Skeleton className="h-5 w-20" />
            ) : featureAccess.isFreePlan ? (
              <Badge 
                variant="secondary" 
                className="px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800"
                onClick={handleUnlockClick}
              >
                Unlock
              </Badge>
            ) : scores.sentiment ? (
              <span className={`text-sm font-semibold ${scores.sentiment.score < 0 ? 'text-red-600' : ''}`}>
                {Math.round(scores.sentiment.score)}%
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">{isBatchRunning ? "Processing..." : scores.hasData ? "--" : "No data"}</span>
            )}
          </div>

          {/* Alignment Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Alignment</span>
            </div>
            {scores.loading ? (
              <Skeleton className="h-5 w-16" />
            ) : featureAccess.isFreePlan ? (
              <Badge 
                variant="secondary" 
                className="px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800"
                onClick={handleUnlockClick}
              >
                Unlock
              </Badge>
            ) : scores.alignment ? (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${getAlignmentColor(scores.alignment.score)}`}>
                  {Math.round(scores.alignment.score)}%
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">{isBatchRunning ? "Processing..." : scores.hasData ? "--" : "No data"}</span>
            )}
          </div>
        </div>
        
        {/* Go to Project Button */}
        {onGoToProject && (
          <div className="pt-3 mt-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full" 
            >
              <ArrowRight className="h-3 w-3 mr-2" />
              Go to project
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}