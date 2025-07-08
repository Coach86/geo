'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, FileText, Search, RefreshCw } from 'lucide-react';
import { useContentKPI } from '@/hooks/useContentKPI';
import { useState } from 'react';
import { toast } from 'sonner';

interface ContentKPIOverviewProps {
  projectId: string;
}

export function ContentKPIOverview({ projectId }: ContentKPIOverviewProps) {
  const { report, loading, refetch, triggerCrawl, getCrawlStatus } = useContentKPI(projectId);
  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);

  const handleTriggerCrawl = async () => {
    try {
      setCrawling(true);
      await triggerCrawl({ maxPages: 50 });
      toast.success('Structure crawl started');
      
      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const status = await getCrawlStatus();
          if (!status.isActive) {
            clearInterval(pollInterval);
            setCrawling(false);
            setCrawlProgress(0);
            await refetch();
            toast.success('Structure analysis completed');
          } else {
            const progress = Math.round(
              ((status.crawledPages || 0) / (status.totalPages || 1)) * 100
            );
            setCrawlProgress(progress);
          }
        } catch (error) {
          clearInterval(pollInterval);
          setCrawling(false);
        }
      }, 5000);
    } catch (error) {
      setCrawling(false);
      toast.error('Failed to start structure crawl');
    }
  };

  if (loading || !report) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Structure KPI Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-gray-200 rounded" />
        </CardContent>
      </Card>
    );
  }

  const scoreColors = {
    high: 'text-accent',
    medium: 'text-yellow-600',
    low: 'text-red-600',
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return scoreColors.high;
    if (score >= 60) return scoreColors.medium;
    return scoreColors.low;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Structure KPI Analysis
          </CardTitle>
          <Button
            onClick={handleTriggerCrawl}
            disabled={crawling}
            size="sm"
            variant="outline"
          >
            {crawling ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing... {crawlProgress}%
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze Structure
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="text-center">
          <div className={`text-4xl font-bold ${getScoreColor(report.summary.avgGlobalScore)}`}>
            {report.summary.avgGlobalScore}
          </div>
          <p className="text-sm text-muted-foreground">Overall Structure Score</p>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          {Object.entries(report.summary.scoreBreakdown).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className={getScoreColor(value as number)}>{value}</span>
              </div>
              <Progress value={value as number} className="h-2" />
            </div>
          ))}
        </div>

        {/* Critical Issues */}
        {report.criticalIssuesCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                {report.criticalIssuesCount} Critical Issues
              </p>
              <p className="text-xs text-red-700">Require immediate attention</p>
            </div>
          </div>
        )}

        {/* Top Recommendations */}
        {report.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Recommendations
            </h4>
            <ul className="space-y-1">
              {report.recommendations.slice(0, 3).map((rec, index) => {
                const content = typeof rec === 'object' && rec !== null ? rec.content : rec;
                return (
                  <li key={index} className="text-xs text-muted-foreground">
                    • {content}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-2xl font-semibold">{report.summary.totalPages}</p>
            <p className="text-xs text-muted-foreground">Pages Analyzed</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">
              {report.topPerformingPages.length}
            </p>
            <p className="text-xs text-muted-foreground">High-Performing Pages</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}