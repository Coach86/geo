'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell
} from 'recharts';
import { useContentKPI } from '@/hooks/useContentKPI';
import { 
  AlertTriangle, CheckCircle, Info, AlertCircle,
  ExternalLink, TrendingUp, TrendingDown, Play, Loader2, RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ContentKPIDashboardProps {
  projectId: string;
}

const COLORS = {
  authority: '#8b5cf6',
  freshness: '#3b82f6',
  structure: '#10b981',
  snippet: '#f59e0b',
  brand: '#ef4444',
};

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const SEVERITY_ICONS = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Info,
  low: CheckCircle,
};

export function ContentKPIDashboard({ projectId }: ContentKPIDashboardProps) {
  const { report, data, loading, triggerCrawl, getCrawlStatus, refetch } = useContentKPI(projectId);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<{ crawledPages: number; totalPages: number } | null>(null);

  // Check crawl status periodically when crawling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCrawling) {
      interval = setInterval(async () => {
        try {
          const status = await getCrawlStatus();
          setCrawlProgress({
            crawledPages: status.crawledPages || 0,
            totalPages: status.totalPages || 100,
          });
          
          if (!status.isActive) {
            setIsCrawling(false);
            setCrawlProgress(null);
            refetch(); // Refresh the data
            toast({
              title: "Crawl completed",
              description: `Successfully analyzed ${status.crawledPages || 0} pages`,
            });
          }
        } catch (error) {
          console.error('Error checking crawl status:', error);
        }
      }, 2000); // Check every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCrawling, getCrawlStatus, refetch]);

  const handleStartCrawl = async () => {
    try {
      console.log('[ContentKPI] Starting crawl...');
      setIsCrawling(true);
      setCrawlProgress({ crawledPages: 0, totalPages: 100 });
      
      const result = await triggerCrawl({ maxPages: 100 });
      console.log('[ContentKPI] Crawl triggered successfully:', result);
      
      toast({
        title: "Crawl started",
        description: "Website analysis has begun. This may take a few minutes.",
      });
    } catch (error: any) {
      console.error('[ContentKPI] Crawl failed:', error);
      setIsCrawling(false);
      setCrawlProgress(null);
      
      // Show more detailed error message
      const errorMessage = error?.message || error?.toString() || "Failed to start crawl. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="h-96" />
        </Card>
      </div>
    );
  }

  // Show empty state with analyze button if no data
  if (!report || report.summary.totalPages === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Content Analysis Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Start analyzing your website content to get insights on SEO optimization and AI visibility.
            </p>
            <Button
              onClick={handleStartCrawl}
              disabled={isCrawling}
              size="lg"
            >
              {isCrawling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Analysis...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Content Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Progress Bar when crawling */}
        {isCrawling && crawlProgress && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Analyzing website content...</span>
                  <span>{Math.round((crawlProgress.crawledPages / crawlProgress.totalPages) * 100)}%</span>
                </div>
                <Progress 
                  value={(crawlProgress.crawledPages / crawlProgress.totalPages) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  This process analyzes your website's content independently from regular batch runs
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Prepare data for radar chart
  const radarData = [
    { dimension: 'Authority', value: report.summary.scoreBreakdown.authority },
    { dimension: 'Freshness', value: report.summary.scoreBreakdown.freshness },
    { dimension: 'Structure', value: report.summary.scoreBreakdown.structure },
    { dimension: 'Snippet', value: report.summary.scoreBreakdown.snippetExtractability },
    { dimension: 'Brand', value: report.summary.scoreBreakdown.brandAlignment },
  ];

  // Prepare data for distribution chart
  const distributionData = report.scoreDistribution.map(item => ({
    range: item._id === 'Other' ? 'Other' : `${item._id}-${parseInt(item._id) + 20}`,
    count: item.count,
  }));

  // Prepare issues by severity
  const issuesBySeverity = report.issuesSummary.reduce((acc, issue) => {
    issue.severities.forEach(sev => {
      if (!acc[sev.severity]) acc[sev.severity] = 0;
      acc[sev.severity] += sev.count;
    });
    return acc;
  }, {} as Record<string, number>);

  const severityData = Object.entries(issuesBySeverity).map(([severity, count]) => ({
    severity,
    count,
  }));

  return (
    <div className="space-y-6">
      {/* Header with Crawl Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content KPI Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Last analyzed: {report.summary.lastAnalyzedAt 
              ? new Date(report.summary.lastAnalyzedAt).toLocaleDateString() 
              : 'Never'}
          </p>
        </div>
        <Button
          onClick={handleStartCrawl}
          disabled={isCrawling}
          size="default"
        >
          {isCrawling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing... {crawlProgress && `(${crawlProgress.crawledPages}/${crawlProgress.totalPages})`}
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Analyze Website
            </>
          )}
        </Button>
      </div>

      {/* Progress Bar when crawling */}
      {isCrawling && crawlProgress && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analyzing website content...</span>
                <span>{Math.round((crawlProgress.crawledPages / crawlProgress.totalPages) * 100)}%</span>
              </div>
              <Progress 
                value={(crawlProgress.crawledPages / crawlProgress.totalPages) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                This process analyzes your website's content independently from regular batch runs
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.avgGlobalScore}/100</div>
            <p className="text-xs text-muted-foreground">
              Across {report.summary.totalPages} pages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.topPerformingPages.length}</div>
            <p className="text-xs text-muted-foreground">
              Pages scoring above 80
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Improvement</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.lowPerformingPages.length}</div>
            <p className="text-xs text-muted-foreground">
              Pages scoring below 60
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.criticalIssuesCount}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate action
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Score Breakdown Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Score Breakdown by Dimension</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-purple-600" />
                    </div>
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          {/* Issues by Severity */}
          <Card>
            <CardHeader>
              <CardTitle>Issues by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ severity, count }) => `${severity}: ${count}`}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Issues by Dimension */}
          <Card>
            <CardHeader>
              <CardTitle>Issues by Dimension</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.issuesSummary.map((dimension) => {
                  const Icon = dimension.severities[0]?.severity 
                    ? SEVERITY_ICONS[dimension.severities[0].severity as keyof typeof SEVERITY_ICONS]
                    : Info;
                  
                  return (
                    <div key={dimension._id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium capitalize">{dimension._id}</h4>
                        <Badge variant="secondary">{dimension.totalIssues} issues</Badge>
                      </div>
                      <div className="flex gap-2">
                        {dimension.severities.map((sev) => (
                          <Badge
                            key={sev.severity}
                            style={{
                              backgroundColor: `${SEVERITY_COLORS[sev.severity as keyof typeof SEVERITY_COLORS]}20`,
                              color: SEVERITY_COLORS[sev.severity as keyof typeof SEVERITY_COLORS],
                            }}
                          >
                            {sev.severity}: {sev.count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          {/* Top Performing Pages */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.topPerformingPages.map((page, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline flex items-center gap-1"
                      >
                        {page.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <Badge variant="success">{page.globalScore}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {page.strengths.map((strength, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Low Performing Pages */}
          <Card>
            <CardHeader>
              <CardTitle>Pages Needing Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.lowPerformingPages.map((page, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline flex items-center gap-1"
                      >
                        {page.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <Badge variant="destructive">{page.globalScore}</Badge>
                    </div>
                    <div className="space-y-1">
                      {page.topIssues.map((issue, i) => {
                        const Icon = SEVERITY_ICONS[issue.severity as keyof typeof SEVERITY_ICONS];
                        return (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <Icon 
                              className="h-3 w-3 mt-0.5" 
                              style={{ color: SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS] }}
                            />
                            <div>
                              <p className="font-medium">{issue.description}</p>
                              <p className="text-muted-foreground">{issue.recommendation}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}