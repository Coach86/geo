"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, Heart, Shield } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getProjectReports, getReportVisibility, getReportSentiment, getReportAlignment } from "@/lib/api/report"
import { RefreshCw, Info } from "lucide-react"
import { useNotificationContext } from "@/providers/notification-provider"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface MintScoreCardProps {
  projectId: string
  token: string
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
}

export function MintScoreCard({ projectId, token }: MintScoreCardProps) {
  const [scores, setScores] = useState<ScoreData>({
    visibility: null,
    sentiment: null,
    alignment: null,
    loading: true,
    hasData: false,
    mintScore: null
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const { notifications } = useNotificationContext()

  useEffect(() => {
    const fetchLatestScores = async () => {
      try {
        const reports = await getProjectReports(projectId, token)
        
        if (reports.length > 0) {
          // Get the latest report
          const latestReport = reports.sort((a, b) => 
            new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
          )[0]

          // Check if a batch might be running (report is less than 10 minutes old)
          const reportAge = Date.now() - new Date(latestReport.generatedAt).getTime()
          const tenMinutes = 10 * 60 * 1000
          setIsProcessing(reportAge < tenMinutes)

          // Fetch detailed data for each section
          const [visibilityData, sentimentData, alignmentData] = await Promise.all([
            getReportVisibility(latestReport.id, token),
            getReportSentiment(latestReport.id, token),
            getReportAlignment(latestReport.id, token)
          ])

          const vis = visibilityData?.overallMentionRate || null
          const sent = sentimentData?.overallSentiment || null
          const align = alignmentData?.overallAlignmentScore || null
          
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
            mintScore
          })
        } else {
          // No reports yet, likely processing
          setScores(prev => ({ ...prev, loading: false, hasData: false, mintScore: null }))
          setIsProcessing(true)
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

  // Convert sentiment string to numeric value for calculation
  const getSentimentNumericValue = (sentiment: string): number => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 100
      case 'neutral':
        return 50
      case 'negative':
        return 0
      default:
        return 50
    }
  }

  // Calculate intelligent Mint Score
  const calculateMintScore = (visibility: number, sentimentStr: string, alignment: number): number => {
    // Convert sentiment to numeric
    const sentimentValue = getSentimentNumericValue(sentimentStr)
    
    // Weighted calculation:
    // - Visibility: 50% (being seen is crucial)
    // - Sentiment: 25% (how you're perceived matters)
    // - Alignment: 25% (brand consistency is important)
    const weightedScore = (visibility * 0.50) + (sentimentValue * 0.25) + (alignment * 0.25)
    
    // Apply a slight curve to make scores more meaningful
    // This pushes very low scores lower and high scores higher
    const curvedScore = Math.pow(weightedScore / 100, 0.85) * 100
    
    return Math.round(curvedScore)
  }

  const getMintScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50'
    if (score >= 80) return 'text-blue-600 bg-blue-50'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50'
    if (score >= 50) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const getMintScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Good'
    if (score >= 70) return 'Fair'
    if (score >= 50) return 'Poor'
    return 'Critical'
  }

  // Listen for notifications for this project
  useEffect(() => {
    const recentNotification = notifications.find(
      n => n.projectId === projectId && 
      (Date.now() - new Date(n.timestamp).getTime() < 5 * 60 * 1000) // 5 minutes
    )
    if (recentNotification) {
      setIsProcessing(false)
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
            const sent = sentimentData?.overallSentiment || null
            const align = alignmentData?.overallAlignmentScore || null
            
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
              mintScore
            })
          }
        } catch (error) {
          console.error("Failed to fetch updated scores:", error)
        }
      }
      fetchLatestScores()
    }
  }, [notifications, projectId, token])

  return (
    <Card className="hover:shadow-lg transition-shadow relative">
      {isProcessing && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Refreshing</span>
          </div>
        </div>
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {scores.mintScore !== null ? (
                <>
                  <span className={`text-2xl font-bold ${getMintScoreColor(scores.mintScore).split(' ')[0]}`}>
                    {scores.mintScore}
                  </span>
                  <Badge variant="secondary" className={getMintScoreColor(scores.mintScore)}>
                    {getMintScoreLabel(scores.mintScore)}
                  </Badge>
                </>
              ) : (
                <span>Mint Score</span>
              )}
            </CardTitle>
            <CardDescription>Latest analysis results</CardDescription>
          </div>
          {scores.mintScore !== null && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <p className="font-semibold">Mint Score Calculation:</p>
                    <ul className="text-sm space-y-1">
                      <li>• Visibility: 50% weight</li>
                      <li>• Sentiment: 25% weight</li>
                      <li>• Alignment: 25% weight</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      Sentiment values: Positive=100, Neutral=50, Negative=0.
                      A slight curve is applied to emphasize performance extremes.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Visibility Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Visibility</span>
            </div>
            {scores.loading ? (
              <Skeleton className="h-5 w-16" />
            ) : scores.visibility !== null ? (
              <span className="text-sm font-semibold">{scores.visibility.toFixed(1)}%</span>
            ) : (
              <span className="text-sm text-muted-foreground">{isProcessing ? "Processing..." : scores.hasData ? "--" : "No data"}</span>
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
            ) : scores.sentiment ? (
              <Badge variant="secondary" className={getSentimentColor(scores.sentiment.sentiment)}>
                {scores.sentiment.sentiment}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">{isProcessing ? "Processing..." : scores.hasData ? "--" : "No data"}</span>
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
            ) : scores.alignment ? (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${getAlignmentColor(scores.alignment.score)}`}>
                  {scores.alignment.score.toFixed(1)}%
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">{isProcessing ? "Processing..." : scores.hasData ? "--" : "No data"}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}