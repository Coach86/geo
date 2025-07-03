'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { useContentKPI } from '@/hooks/useContentKPI';
import { 
  AlertTriangle, CheckCircle, Info, AlertCircle,
  ExternalLink, TrendingUp, TrendingDown, Play, Loader2,
  LayoutDashboard, BarChart3, AlertOctagon, Globe, FileText, Settings,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { API_BASE_URL } from '@/lib/api/constants';
import { PageAnalysisTable } from './PageAnalysisTable';
import { ScoringRulesTab } from './ScoringRulesTab';
import { DomainAnalysisTab } from './DomainAnalysisTab';
import { CombinedScoresTab } from './CombinedScoresTab';
import { OptimizationDrawer } from './OptimizationDrawer';

interface ContentKPIDashboardProps {
  projectId: string;
  isCrawling: boolean;
  crawlProgress: { crawledPages: number; totalPages: number; currentUrl?: string } | null;
  showCrawlDialog: boolean;
  setShowCrawlDialog: (show: boolean) => void;
  handleStartCrawl: (maxPages: number) => void;
}

const COLORS = {
  authority: '#8B5CF6', // Vibrant purple
  freshness: '#3B82F6', // Vibrant Blue
  structure: '#10B981', // Vibrant Emerald
  brand: '#EF4444', // Vibrant Red
};

const DIMENSION_COLORS = {
  Authority: '#8B5CF6', // Vibrant purple
  Freshness: '#3B82F6', // Vibrant Blue
  Structure: '#10B981', // Vibrant Emerald
  Brand: '#EF4444', // Vibrant Red
};

// Using visibility page color scheme for severity
const SEVERITY_COLORS = {
  critical: '#EF4444', // Vibrant Red
  high: '#F59E0B', // Vibrant Amber
  medium: '#3B82F6', // Vibrant Blue
  low: '#10B981', // Vibrant Emerald
};

const SEVERITY_ICONS = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Info,
  low: CheckCircle,
};

// Helper function to format URLs for display
const formatUrlForDisplay = (url: string, maxLength: number = 60): string => {
  if (!url || url === 'Starting...') return url;
  
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;
    const domain = urlObj.hostname;
    
    // If the full URL is short enough, show it
    if (url.length <= maxLength) {
      return url.replace(/^https?:\/\//, '');
    }
    
    // Otherwise, show domain + truncated path
    const domainPart = domain;
    const remainingLength = maxLength - domainPart.length - 3; // 3 for "..."
    
    if (path.length > remainingLength) {
      return `${domainPart}${path.substring(0, remainingLength)}...`;
    }
    
    return `${domainPart}${path}`;
  } catch {
    // If URL parsing fails, just truncate the string
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
  }
};

export function ContentKPIDashboard({ 
  projectId, 
  isCrawling, 
  crawlProgress, 
  showCrawlDialog, 
  setShowCrawlDialog, 
  handleStartCrawl 
}: ContentKPIDashboardProps) {
  const { report, data, loading } = useContentKPI(projectId);
  const { token } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [combinedScore, setCombinedScore] = useState<number | null>(null);
  const [domainData, setDomainData] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<{
    guideName: string;
    dimension?: string;
    severity?: string;
  } | null>(null);

  const handleOpenGuide = (guideName: string, dimension?: string, severity?: string) => {
    setSelectedGuide({ guideName, dimension, severity });
    setDrawerOpen(true);
  };

  // Fetch combined score
  useEffect(() => {
    const fetchCombinedScore = async () => {
      if (!token || !projectId) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/user/projects/${projectId}/crawler/combined-scores`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result?.combined?.overallScore !== undefined) {
            setCombinedScore(result.combined.overallScore);
          }
        }
      } catch (err) {
        console.error('Error fetching combined score:', err);
      }
    };

    fetchCombinedScore();
  }, [token, projectId]);

  // Fetch domain analysis data
  useEffect(() => {
    const fetchDomainAnalysis = async () => {
      if (!token || !projectId) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/user/projects/${projectId}/crawler/domain-analysis`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          setDomainData(result);
        }
      } catch (err) {
        console.error('Error fetching domain analysis:', err);
      }
    };

    fetchDomainAnalysis();
  }, [token, projectId]);

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
  if (!report || !data || report.summary.totalPages === 0 || data.scores.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Page Intelligence Analysis Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Start analyzing your website pages to get intelligent insights on SEO optimization and AI visibility.
            </p>
            <Button
              onClick={() => setShowCrawlDialog(true)}
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
                  Start Page Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Progress Bar when crawling */}
        {isCrawling && crawlProgress && crawlProgress.totalPages > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div>Analyzing website content...</div>
                    {/* Debug info */}
                    <div className="text-xs text-red-500 mt-1">
                      Debug: currentUrl = "{crawlProgress.currentUrl || 'undefined'}"
                    </div>
                    {crawlProgress.currentUrl && crawlProgress.currentUrl !== 'Starting...' && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Globe className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate" title={crawlProgress.currentUrl}>
                          {formatUrlForDisplay(crawlProgress.currentUrl, 60)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="font-medium">{Math.min(100, Math.round((crawlProgress.crawledPages / crawlProgress.totalPages) * 100))}%</span>
                </div>
                <Progress 
                  value={Math.min(100, Math.max(0, (crawlProgress.crawledPages / crawlProgress.totalPages) * 100))} 
                  className="h-2"
                />
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Pages analyzed: {crawlProgress.crawledPages} / {crawlProgress.totalPages}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    This process analyzes your website's content independently from regular batch runs
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Prepare data for radar chart
  const radarData = [
    { 
      dimension: 'Authority',
      value: report.summary.scoreBreakdown.authority,
      fullMark: 100
    },
    { 
      dimension: 'Freshness',
      value: report.summary.scoreBreakdown.freshness,
      fullMark: 100
    },
    { 
      dimension: 'Structure',
      value: report.summary.scoreBreakdown.structure,
      fullMark: 100
    },
    { 
      dimension: 'Brand',
      value: report.summary.scoreBreakdown.brandAlignment,
      fullMark: 100
    },
  ];


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
      {/* Progress Bar when crawling */}
      {isCrawling && crawlProgress && crawlProgress.totalPages > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <div className="flex-1">
                  <div>Analyzing website content...</div>
                  {crawlProgress.currentUrl && crawlProgress.currentUrl !== 'Starting...' && (
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Globe className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate" title={crawlProgress.currentUrl}>
                        {formatUrlForDisplay(crawlProgress.currentUrl, 60)}
                      </span>
                    </div>
                  )}
                </div>
                <span className="font-medium">{Math.min(100, Math.round((crawlProgress.crawledPages / crawlProgress.totalPages) * 100))}%</span>
              </div>
              <Progress 
                value={Math.min(100, Math.max(0, (crawlProgress.crawledPages / crawlProgress.totalPages) * 100))} 
                className="h-2"
              />
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Pages analyzed: {crawlProgress.crawledPages} / {crawlProgress.totalPages}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  This process analyzes your website's content independently from regular batch runs
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="scores" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Scores
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4" />
              Issues
            </TabsTrigger>
            <TabsTrigger value="domain" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Domain Analysis
            </TabsTrigger>
            <TabsTrigger value="detailed" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Page Analysis
            </TabsTrigger>
          </TabsList>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTab('rules')}
            className={`flex items-center gap-2 ${selectedTab === 'rules' ? 'bg-accent text-accent-foreground' : ''}`}
          >
            <Settings className="h-4 w-4" />
            Scoring Rules
          </Button>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards - moved from top level */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Overall Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-gray-900">{combinedScore !== null ? Math.round(combinedScore) : report.summary.avgGlobalScore}/100</div>
                <p className="text-xs text-gray-500">
                  {combinedScore !== null ? 'Combined page & domain score' : `Across ${report.summary.totalPages} pages`}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Top Performers</CardTitle>
                <CheckCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-gray-900">
                  {data?.scores?.filter(page => page.globalScore > 80).length || 0}
                </div>
                <p className="text-xs text-gray-500">
                  Pages scoring above 80
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Need Improvement</CardTitle>
                <AlertTriangle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-gray-900">
                  {data?.scores?.filter(page => page.globalScore < 60).length || 0}
                </div>
                <p className="text-xs text-gray-500">
                  Pages scoring below 60
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Critical Issues</CardTitle>
                <AlertCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-gray-900">{report.criticalIssuesCount}</div>
                <p className="text-xs text-gray-500">
                  Require immediate action
                </p>
              </CardContent>
            </Card>
          </div>
          {/* Recommendations and Score Breakdown Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Recommendations - 2/3 width */}
            <div className="md:col-span-2">
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900">Recommendations</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenGuide('Optimization Guide Overview')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <BookOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[380px] overflow-y-auto">
                    {/* Generate smart recommendations based on scores and issues */}
                    {(() => {
                      const recommendations = [];
                      
                      // Analyze each dimension and create targeted recommendations
                      const dimensionData = [
                        { 
                          name: 'Authority', 
                          score: report.summary.scoreBreakdown.authority,
                          icon: CheckCircle,
                          color: COLORS.authority,
                          threshold: 70
                        },
                        { 
                          name: 'Freshness', 
                          score: report.summary.scoreBreakdown.freshness,
                          icon: TrendingUp,
                          color: COLORS.freshness,
                          threshold: 75
                        },
                        { 
                          name: 'Structure', 
                          score: report.summary.scoreBreakdown.structure,
                          icon: Info,
                          color: COLORS.structure,
                          threshold: 80
                        },
                        { 
                          name: 'Brand', 
                          score: report.summary.scoreBreakdown.brandAlignment,
                          icon: AlertTriangle,
                          color: COLORS.brand,
                          threshold: 70
                        }
                      ];

                      // Sort dimensions by score (lowest first for priority)
                      dimensionData.sort((a, b) => a.score - b.score);

                      // Count issues by dimension
                      const issuesByDimension = report.issuesSummary.reduce((acc, dim) => {
                        acc[dim._id] = dim.totalIssues;
                        return acc;
                      }, {} as Record<string, number>);

                      // Count critical/high severity issues
                      const criticalIssues = report.issuesSummary.reduce((acc, dim) => {
                        const critical = dim.severities.filter(s => s.severity === 'critical' || s.severity === 'high')
                          .reduce((sum, s) => sum + s.count, 0);
                        if (critical > 0) acc[dim._id] = critical;
                        return acc;
                      }, {} as Record<string, number>);

                      // Generate recommendations for each dimension
                      dimensionData.forEach((dim) => {
                        if (dim.score < dim.threshold) {
                          const issues = issuesByDimension[dim.name.toLowerCase()] || 0;
                          const criticals = criticalIssues[dim.name.toLowerCase()] || 0;
                          
                          let priority = 'medium';
                          if (dim.score < 50 || criticals > 5) priority = 'high';
                          if (dim.score < 30 || criticals > 10) priority = 'critical';
                          
                          const recommendation = {
                            dimension: dim.name,
                            score: dim.score,
                            priority,
                            issues,
                            criticals,
                            icon: dim.icon,
                            color: dim.color,
                            actions: [] as string[]
                          };

                          // Add specific actions based on dimension
                          if (dim.name === 'Authority') {
                            recommendation.actions = [
                              'Build more high-quality backlinks to key pages',
                              'Improve internal linking structure',
                              'Create authoritative content with expert citations'
                            ];
                          } else if (dim.name === 'Freshness') {
                            recommendation.actions = [
                              'Update outdated content on high-traffic pages',
                              'Establish a regular content refresh schedule',
                              'Add "last updated" dates to important pages'
                            ];
                          } else if (dim.name === 'Structure') {
                            recommendation.actions = [
                              'Fix missing or duplicate meta tags',
                              'Improve heading hierarchy (H1-H6)',
                              'Optimize page load speed and Core Web Vitals'
                            ];
                          } else if (dim.name === 'Brand') {
                            recommendation.actions = [
                              'Increase brand mentions in key content',
                              'Ensure consistent brand messaging',
                              'Add brand-specific schema markup'
                            ];
                          }

                          recommendations.push(recommendation);
                        }
                      });

                      // Limit to top 2 recommendations for height consistency
                      const topRecommendations = recommendations.slice(0, 2);

                      const getPriorityColor = (priority: string) => {
                        if (priority === 'critical') return 'text-red-600 bg-red-50';
                        if (priority === 'high') return 'text-orange-600 bg-orange-50';
                        return 'text-yellow-600 bg-yellow-50';
                      };

                      const getPriorityLabel = (priority: string) => {
                        if (priority === 'critical') return 'Critical';
                        if (priority === 'high') return 'High Priority';
                        return 'Medium Priority';
                      };

                      if (topRecommendations.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                            <p className="text-lg font-semibold text-gray-900">Great job!</p>
                            <p className="text-sm text-gray-600">All dimensions are performing well.</p>
                          </div>
                        );
                      }

                      return topRecommendations.map((rec, index) => {
                        const Icon = rec.icon;
                        return (
                          <div 
                            key={index} 
                            className="border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleOpenGuide(rec.actions[0], rec.dimension.toLowerCase())}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="p-1.5 rounded-lg"
                                  style={{ backgroundColor: `${rec.color}20` }}
                                >
                                  <Icon className="h-4 w-4" style={{ color: rec.color }} />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900 text-sm">
                                    Improve {rec.dimension} Score
                                  </h4>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-600">
                                      Current: {rec.score}%
                                    </span>
                                    {rec.issues > 0 && (
                                      <span className="text-xs text-gray-500">
                                        • {rec.issues} issues{rec.criticals > 0 && ` (${rec.criticals} critical)`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Badge 
                                variant="secondary" 
                                className={`${getPriorityColor(rec.priority)} border-0 text-xs`}
                              >
                                {getPriorityLabel(rec.priority)}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1.5 ml-9">
                              {rec.actions.slice(0, 2).map((action, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <div className="mt-1">
                                    <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                  </div>
                                  <p className="text-xs text-gray-700">{action}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Score Breakdown Radar Chart - 1/3 width */}
            <div className="md:col-span-1">
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid 
                        gridType="polygon"
                        radialLines={true}
                        stroke="#e5e7eb"
                        strokeWidth={1}
                      />
                      <PolarAngleAxis 
                        dataKey="dimension" 
                        tick={{ fill: '#374151', fontSize: 14, fontWeight: 600 }}
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]}
                        tickCount={5}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={false}
                      />
                      {/* Single Radar with gradient fill and colored dots */}
                      <defs>
                        <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={DIMENSION_COLORS.Authority} stopOpacity={0.6} />
                          <stop offset="33%" stopColor={DIMENSION_COLORS.Freshness} stopOpacity={0.6} />
                          <stop offset="66%" stopColor={DIMENSION_COLORS.Structure} stopOpacity={0.6} />
                          <stop offset="100%" stopColor={DIMENSION_COLORS.Brand} stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <Radar 
                        name="Score" 
                        dataKey="value" 
                        stroke="#6366f1"
                        fill="url(#radarGradient)"
                        fillOpacity={0.3}
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          padding: '12px 16px'
                        }}
                        formatter={(value: number) => [`${value}%`, '']}
                        labelStyle={{ color: '#374151', fontWeight: 600, marginBottom: '4px' }}
                        itemStyle={{ color: '#6b7280' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
                    {radarData.map((item) => {
                      const color = DIMENSION_COLORS[item.dimension as keyof typeof DIMENSION_COLORS];
                      return (
                        <div key={item.dimension} className="flex items-center gap-2">
                          <div className="relative">
                            <div 
                              className="w-4 h-4 rounded-full border-2 border-white shadow-sm" 
                              style={{ backgroundColor: color }}
                            />
                            <div 
                              className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white"
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">
                            {item.value}%
                          </span>
                          <span className="text-sm text-gray-500">
                            {item.dimension}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Pages Section - moved from Pages tab */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Performing Pages */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Top Performing Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.scores?.filter(page => page.globalScore > 80).map((page, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-700 hover:underline flex items-center gap-1 truncate"
                        >
                          {page.url}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                        <Badge variant="default" className="bg-green-100 text-green-800 ml-2">
                          {Math.round(page.globalScore)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[
                          ...(page.scores.authority >= 80 ? ['Strong Authority'] : []),
                          ...(page.scores.freshness >= 80 ? ['Fresh Content'] : []),
                          ...(page.scores.structure >= 80 ? ['Well Structured'] : []),
                          ...(page.scores.brandAlignment >= 80 ? ['Brand Aligned'] : []),
                        ].map((strength, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )) || []}
                  {(!data?.scores?.filter(page => page.globalScore > 80).length) && (
                    <p className="text-sm text-gray-500">No pages scoring above 80 yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pages Needing Improvement */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Pages Needing Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.scores?.filter(page => page.globalScore < 60 && !(page.skipped && page.globalScore === 0)).sort((a, b) => a.globalScore - b.globalScore).slice(0, 5).map((page, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-700 hover:underline flex items-center gap-1 truncate"
                        >
                          {page.url}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                        <Badge variant="destructive" className="ml-2">
                          {Math.round(page.globalScore)}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {page.issues?.slice(0, 2).map((issue, i) => {
                          const Icon = SEVERITY_ICONS[issue.severity as keyof typeof SEVERITY_ICONS];
                          return (
                            <div 
                              key={i} 
                              className="flex items-start gap-2 text-xs cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
                              onClick={() => handleOpenGuide(issue.description, issue.dimension?.toLowerCase(), issue.severity)}
                            >
                              <Icon 
                                className="h-3 w-3 mt-0.5 flex-shrink-0" 
                                style={{ color: SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_ICONS] }}
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-gray-700 truncate">{issue.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )) || []}
                  {(!data?.scores?.filter(page => page.globalScore < 60 && !(page.skipped && page.globalScore === 0)).length) && (
                    <p className="text-sm text-gray-500">No pages needing improvement.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scores" className="space-y-4">
          <CombinedScoresTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Issues by Dimension - 2/3 width */}
            <div className="md:col-span-2">
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Issues by Dimension</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.issuesSummary.map((dimension) => {
                      const Icon = dimension.severities[0]?.severity 
                        ? SEVERITY_ICONS[dimension.severities[0].severity as keyof typeof SEVERITY_ICONS]
                        : Info;
                      
                      // Get dimension color
                      const dimensionKey = dimension._id ? dimension._id.charAt(0).toUpperCase() + dimension._id.slice(1) : '';
                      const dimensionColor = DIMENSION_COLORS[dimensionKey as keyof typeof DIMENSION_COLORS] || '#6b7280';
                      
                      return (
                        <div key={dimension._id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: dimensionColor }}
                              />
                              <h4 className="font-medium capitalize text-gray-900">{dimension._id}</h4>
                            </div>
                            <Badge 
                              variant="outline"
                              style={{
                                borderColor: dimensionColor,
                                color: dimensionColor,
                                backgroundColor: `${dimensionColor}10`
                              }}
                            >
                              {dimension.totalIssues} issues
                            </Badge>
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
            </div>

            {/* Issues by Severity - 1/3 width */}
            <div className="md:col-span-1">
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Issues by Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={severityData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          label={({ count }) => count > 0 ? count : ''}
                        >
                          {severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                      {Object.entries(SEVERITY_COLORS).map(([severity, color]) => {
                        const count = severityData.find(item => item.severity === severity)?.count || 0;
                        return (
                          <div key={severity} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm capitalize text-gray-700">
                              {severity}
                              {count > 0 && <span className="font-medium ml-1">({count})</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* All Issues Table - Full width */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">All Issues</CardTitle>
              <p className="text-sm text-gray-500">Complete list of issues across all pages and domains</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Severity</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Issue</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Dimension</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Source</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Collect all issues from pages
                      const allIssues: Array<{
                        source: string;
                        sourceType: 'page' | 'domain';
                        issue: any;
                        dimension: string;
                      }> = [];

                      // Get issues from page analysis
                      data?.scores?.forEach(page => {
                        if (page.issues && page.issues.length > 0) {
                          page.issues.forEach(issue => {
                            allIssues.push({
                              source: page.url,
                              sourceType: 'page',
                              issue,
                              dimension: issue.dimension || 'General'
                            });
                          });
                        }
                      });

                      // Add domain issues to allIssues
                      domainData?.domainAnalyses?.forEach((domain: any) => {
                        if (domain.issues && domain.issues.length > 0) {
                          domain.issues.forEach((issue: string, index: number) => {
                            allIssues.push({
                              source: domain.domain,
                              sourceType: 'domain',
                              issue: {
                                description: issue,
                                severity: 'medium', // Default severity for domain issues
                                dimension: 'Domain Analysis'
                              },
                              dimension: 'Domain Analysis'
                            });
                          });
                        }
                      });

                      // Sort issues by severity (critical > high > medium > low)
                      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                      allIssues.sort((a, b) => {
                        const severityA = severityOrder[a.issue.severity as keyof typeof severityOrder] ?? 4;
                        const severityB = severityOrder[b.issue.severity as keyof typeof severityOrder] ?? 4;
                        return severityA - severityB;
                      });

                      if (allIssues.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="text-center py-8">
                              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                              <p className="text-lg font-semibold text-gray-900">No Issues Found</p>
                              <p className="text-sm text-gray-600">Great job! No issues detected across your pages.</p>
                            </td>
                          </tr>
                        );
                      }

                      return allIssues.map((item, index) => {
                        const Icon = SEVERITY_ICONS[item.issue.severity as keyof typeof SEVERITY_ICONS] || Info;
                        const severityColor = SEVERITY_COLORS[item.issue.severity as keyof typeof SEVERITY_COLORS] || '#6b7280';
                        
                        return (
                          <tr 
                            key={index} 
                            className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => handleOpenGuide(item.issue.description, item.dimension.toLowerCase(), item.issue.severity)}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" style={{ color: severityColor }} />
                                <Badge 
                                  variant="outline" 
                                  className="text-xs"
                                  style={{
                                    borderColor: severityColor,
                                    color: severityColor,
                                    backgroundColor: `${severityColor}10`
                                  }}
                                >
                                  {item.issue.severity}
                                </Badge>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <p className="text-sm text-gray-900">{item.issue.description}</p>
                                {item.issue.recommendation && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Recommendation:</span> {item.issue.recommendation}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-xs">
                                {item.dimension}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              {item.sourceType === 'page' ? (
                                <a
                                  href={item.source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  {item.source.length > 50 ? item.source.substring(0, 50) + '...' : item.source}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-sm text-gray-700">{item.source}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary" className="text-xs">
                                {item.sourceType === 'page' ? 'Page' : 'Domain'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domain" className="space-y-4">
          <DomainAnalysisTab projectId={projectId} onIssueClick={(issue) => handleOpenGuide(issue.description, issue.dimension?.toLowerCase(), issue.severity)} />
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {/* Prepare all pages data for the detailed table */}
          {(() => {
            
            const allPages = data?.scores?.map(page => ({
              url: page.url,
              title: page.url, // ContentScore doesn't have title field
              globalScore: page.globalScore,
              scores: page.scores, // Already in correct format
              details: page.details, // Pass the LLM analysis details
              calculationDetails: page.calculationDetails, // Pass calculation breakdowns
              issues: page.issues || [], // Already in correct format
              strengths: [
                ...(page.scores.authority >= 80 ? ['Strong Authority Signals'] : []),
                ...(page.scores.freshness >= 80 ? ['Fresh Content'] : []),
                ...(page.scores.structure >= 80 ? ['Well Structured'] : []),
                // Only show brand strength if score is high AND there are actual brand mentions
                ...(page.scores.brandAlignment >= 80 && page.details?.brand?.brandMentions > 0 ? ['Strong Brand Alignment'] : []),
              ],
              crawledAt: new Date(page.analyzedAt),
              // Add the missing category fields
              pageCategory: page.pageCategory,
              analysisLevel: page.analysisLevel,
              categoryConfidence: page.categoryConfidence,
              skipped: page.skipped,
              skipReason: page.skipReason,
            })) || [];

            return <PageAnalysisTable 
              pages={allPages} 
              projectId={projectId} 
              onIssueClick={(issue) => handleOpenGuide(issue.description, issue.dimension?.toLowerCase(), issue.severity)} 
            />;
          })()}
        </TabsContent>
        
        <TabsContent value="rules" className="space-y-4">
          <ScoringRulesTab projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* Optimization Drawer */}
      {selectedGuide && (
        <OptimizationDrawer
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedGuide(null);
          }}
          guideName={selectedGuide.guideName}
          dimension={selectedGuide.dimension}
          severity={selectedGuide.severity}
        />
      )}
    </div>
  );
}