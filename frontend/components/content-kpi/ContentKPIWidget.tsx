'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, Play, Loader2 } from 'lucide-react';
import { useContentKPI } from '@/hooks/useContentKPI';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface ContentKPIWidgetProps {
  projectId: string;
  compact?: boolean;
}

export function ContentKPIWidget({ projectId, compact = false }: ContentKPIWidgetProps) {
  const { report, loading, triggerCrawl, getCrawlStatus, refetch } = useContentKPI(projectId);
  const [isCrawling, setIsCrawling] = useState(false);
  const router = useRouter();

  // Check crawl status periodically when crawling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCrawling) {
      interval = setInterval(async () => {
        try {
          const status = await getCrawlStatus();
          
          if (!status.isActive) {
            setIsCrawling(false);
            refetch();
            toast({
              title: "Analysis completed",
              description: `Successfully analyzed ${status.crawledPages || 0} pages`,
            });
          }
        } catch (error) {
          console.error('Error checking crawl status:', error);
        }
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCrawling, getCrawlStatus, refetch]);

  const handleStartCrawl = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    try {
      setIsCrawling(true);
      await triggerCrawl({ maxPages: 100 });
      toast({
        title: "Analysis started",
        description: "Structure KPI analysis is running...",
      });
    } catch (error) {
      setIsCrawling(false);
      toast({
        title: "Error",
        description: "Failed to start analysis",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = () => {
    router.push('/content-kpi');
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Structure KPI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2" />
            <div className="h-8 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no report
  if (!report || report.summary.totalPages === 0) {
    return (
      <Card className="h-full">
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Structure KPI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">No analysis yet</p>
            <Button
              size="sm"
              variant="default"
              className="w-full"
              onClick={handleStartCrawl}
              disabled={isCrawling}
            >
              {isCrawling ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Start Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const scoreColor = 
    report.summary.avgGlobalScore >= 80 ? 'text-green-600' :
    report.summary.avgGlobalScore >= 60 ? 'text-yellow-600' :
    'text-red-600';

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Structure Score
          </span>
          <span className={`text-sm font-bold ${scoreColor}`}>
            {report.summary.avgGlobalScore}/100
          </span>
        </div>
        <Progress value={report.summary.avgGlobalScore} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {report.summary.totalPages} pages analyzed
        </p>
      </div>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Structure KPI
          </span>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {report.summary.avgGlobalScore}
          </div>
          <p className="text-xs text-muted-foreground">Overall Score</p>
        </div>
        
        <div className="space-y-2">
          {Object.entries(report.summary.scoreBreakdown).slice(0, 3).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="capitalize text-muted-foreground">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="font-medium">{value}</span>
              </div>
              <Progress value={value as number} className="h-1" />
            </div>
          ))}
        </div>

        <div className="pt-2 border-t space-y-2">
          <p className="text-xs text-muted-foreground">
            {report.summary.totalPages} pages • {report.criticalIssuesCount} critical issues
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleStartCrawl}
              disabled={isCrawling}
            >
              {isCrawling ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Running
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Analyze
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              onClick={handleViewDetails}
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}