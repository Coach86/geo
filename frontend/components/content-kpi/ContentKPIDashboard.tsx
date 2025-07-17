'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/persistent-tooltip';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { useContentKPI } from '@/hooks/useContentKPI';
import { 
  AlertTriangle, CheckCircle, Info, AlertCircle,
  ExternalLink, TrendingUp, TrendingDown, Play, Loader2,
  LayoutDashboard, BarChart3, AlertOctagon, Globe, FileText, Settings,
  BookOpen, Search, Brain, Lightbulb
} from 'lucide-react';
import { DonutChart } from './DonutChart';
import { DIMENSION_COLORS, getDimensionColor } from '@/lib/constants/colors';
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
  crawlProgress: { crawledPages: number; totalPages: number; currentUrl?: string; status?: string } | null;
  showCrawlDialog: boolean;
  setShowCrawlDialog: (show: boolean) => void;
  handleStartCrawl: (settings: { maxPages: number; userAgent?: string; includePatterns?: string[]; excludePatterns?: string[]; mode?: 'auto' | 'manual'; manualUrls?: string[] }) => void;
}

const COLORS = {
  technical: '#3B82F6', // Vibrant Blue
  structure: '#F59E0B', // Vibrant Amber (Orange)
  authority: '#8B5CF6', // Vibrant purple
  quality: '#6B7280', // Gray
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

// Animated status text component
const AnimatedStatusText = ({ status }: { status?: string }) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  
  const crawlingTexts = [
    'Getting HTML content...',
    'Parsing page structure...',
    'Following internal links...',
    'Checking robots.txt...',
    'Extracting metadata...',
    'Discovering new pages...',
    'Validating URLs...',
    'Building sitemap...'
  ];
  
  const analyzingTexts = [
    'Checking HTML validity...',
    'Analyzing content depth...',
    'Evaluating SEO signals...',
    'Processing page structure...',
    'Examining authority markers...',
    'Calculating quality metrics...',
    'Running AI analysis...',
    'Generating insights...'
  ];
  
  const texts = status === 'analyzing' ? analyzingTexts : crawlingTexts;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % texts.length);
    }, 2000); // Change text every 2 seconds
    
    return () => clearInterval(interval);
  }, [texts.length, status]);
  
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span className="animate-fade-in">{texts[currentTextIndex]}</span>
    </div>
  );
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
  const router = useRouter();
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

  // Handle tab changes with URL hash persistence
  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    // Update URL hash without page reload
    const url = new URL(window.location.href);
    url.hash = value;
    router.replace(url.toString(), { scroll: false });
  };

  // Initialize tab from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['overview', 'domain', 'detailed', 'rules'];
    if (hash && validTabs.includes(hash)) {
      setSelectedTab(hash);
    }
  }, []);

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['overview', 'domain', 'detailed', 'rules'];
      if (hash && validTabs.includes(hash)) {
        setSelectedTab(hash);
      } else if (!hash) {
        setSelectedTab('overview');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

        {/* Progress Bar when crawling or completed */}
        {(isCrawling || crawlProgress?.status === 'completed') && crawlProgress && crawlProgress.totalPages > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {crawlProgress.status === 'completed' ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Analysis completed successfully!</span>
                        </>
                      ) : crawlProgress.status === 'analyzing' ? (
                        <>
                          <Brain className="h-4 w-4 animate-pulse" />
                          <span>Analyzing content with AI...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 animate-pulse" />
                          <span>Crawling website pages...</span>
                        </>
                      )}
                    </div>
                    {crawlProgress.currentUrl && crawlProgress.currentUrl !== 'Starting...' && crawlProgress.currentUrl !== 'Completed' && crawlProgress.status !== 'analyzing' && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Globe className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate" title={crawlProgress.currentUrl}>
                          {formatUrlForDisplay(crawlProgress.currentUrl, 60)}
                        </span>
                      </div>
                    )}
                    {crawlProgress.status === 'analyzing' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Processing crawled data and generating insights...
                      </div>
                    )}
                    {crawlProgress.status === 'completed' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Successfully analyzed {crawlProgress.crawledPages} pages. Click reload to view the results.
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
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>
                      {crawlProgress.status === 'completed'
                        ? `Analyzed: ${crawlProgress.crawledPages} pages`
                        : crawlProgress.status === 'analyzing' 
                        ? `Analyzing: ${crawlProgress.crawledPages} / ${crawlProgress.totalPages} pages`
                        : `Pages crawled: ${crawlProgress.crawledPages} / ${crawlProgress.totalPages}`
                      }
                    </span>
                    {crawlProgress.status === 'completed' ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          window.location.reload();
                        }}
                        className="h-7"
                      >
                        <Loader2 className="mr-1.5 h-3 w-3" />
                        Reload
                      </Button>
                    ) : (
                      <AnimatedStatusText status={crawlProgress.status} />
                    )}
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
      dimension: 'Technical',
      abbreviation: 'T',
      value: report.summary.scoreBreakdown?.technical || 0,
      fullMark: 100,
      color: COLORS.technical
    },
    { 
      dimension: 'Structure',
      abbreviation: 'S',
      value: report.summary.scoreBreakdown?.structure || 0,
      fullMark: 100,
      color: COLORS.structure
    },
    { 
      dimension: 'Authority',
      abbreviation: 'A',
      value: report.summary.scoreBreakdown?.authority || 0,
      fullMark: 100,
      color: COLORS.authority
    },
    { 
      dimension: 'Quality',
      abbreviation: 'Q',
      value: report.summary.scoreBreakdown?.quality || 0,
      fullMark: 100,
      color: COLORS.quality
    },
  ];


  // Prepare issues by severity
  const issuesBySeverity = report.issuesSummary.reduce((acc, issue) => {
    issue.severities.forEach((sev: { severity: string; count: number }) => {
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
      {/* Progress Bar when crawling or completed */}
      {(isCrawling || crawlProgress?.status === 'completed') && crawlProgress && crawlProgress.totalPages > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {crawlProgress.status === 'completed' ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Analysis completed successfully!</span>
                      </>
                    ) : crawlProgress.status === 'analyzing' ? (
                      <>
                        <Brain className="h-4 w-4 animate-pulse" />
                        <span>Analyzing content with AI...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 animate-pulse" />
                        <span>Crawling website pages...</span>
                      </>
                    )}
                  </div>
                  {crawlProgress.currentUrl && crawlProgress.currentUrl !== 'Starting...' && crawlProgress.currentUrl !== 'Completed' && crawlProgress.status !== 'analyzing' && (
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Globe className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate" title={crawlProgress.currentUrl}>
                        {formatUrlForDisplay(crawlProgress.currentUrl, 60)}
                      </span>
                    </div>
                  )}
                  {crawlProgress.status === 'analyzing' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Processing crawled data and generating insights...
                    </div>
                  )}
                  {crawlProgress.status === 'completed' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Successfully analyzed {crawlProgress.crawledPages} pages. Click reload to view the results.
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
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>
                    {crawlProgress.status === 'completed'
                      ? `Analyzed: ${crawlProgress.crawledPages} pages`
                      : crawlProgress.status === 'analyzing' 
                      ? `Analyzing: ${crawlProgress.crawledPages} / ${crawlProgress.totalPages} pages`
                      : `Pages crawled: ${crawlProgress.crawledPages} / ${crawlProgress.totalPages}`
                    }
                  </span>
                  {crawlProgress.status === 'completed' ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="h-7"
                    >
                      <Loader2 className="mr-1.5 h-3 w-3" />
                      Reload
                    </Button>
                  ) : (
                    <AnimatedStatusText status={crawlProgress.status} />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
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
            onClick={() => handleTabChange('rules')}
            className={`flex items-center gap-2 ${selectedTab === 'rules' ? 'bg-accent text-accent-foreground' : ''}`}
          >
            <Settings className="h-4 w-4" />
            Scoring Rules
          </Button>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <CombinedScoresTab projectId={projectId} />
          
          {/* All Issues Table - Full width */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Issues to Fix</CardTitle>
                  <p className="text-sm text-gray-500">Prioritize these improvements to boost your content performance</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Severity</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Dimension</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Issue</th>
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
                        pageTitle?: string;
                      }> = [];

                      // Get issues from page analysis
                      data?.scores?.forEach(page => {
                        if (page.issues && page.issues.length > 0) {
                          page.issues.forEach(issue => {
                            allIssues.push({
                              source: page.url,
                              sourceType: 'page',
                              issue,
                              dimension: issue.dimension || 'General',
                              pageTitle: page.title
                            });
                          });
                        }
                      });

                      // Add domain issues to allIssues
                      domainData?.domainAnalyses?.forEach((domain: any) => {
                        if (domain.issues && domain.issues.length > 0) {
                          domain.issues.forEach((issue: string, index: number) => {
                            // Try to determine dimension from the issue text
                            let dimension = 'Authority'; // Default for domain-level issues
                            const issueLower = issue.toLowerCase();
                            
                            if (issueLower.includes('technical') || issueLower.includes('mobile') || issueLower.includes('https')) {
                              dimension = 'Technical';
                            } else if (issueLower.includes('structure') || issueLower.includes('content')) {
                              dimension = 'Structure';
                            } else if (issueLower.includes('monitoring') || issueLower.includes('kpi') || issueLower.includes('quality')) {
                              dimension = 'Quality';
                            }
                            
                            allIssues.push({
                              source: domain.domain,
                              sourceType: 'domain',
                              issue: {
                                description: issue,
                                severity: 'medium', // Default severity for domain issues
                                dimension: dimension
                              },
                              dimension: dimension
                            });
                          });
                        }
                      });

                      // Group issues by ID (ruleId or id)
                      const groupedIssues = allIssues.reduce((acc, item) => {
                        const issueKey = item.issue.ruleId || item.issue.id || `${item.issue.description}_${item.issue.severity}`;
                        
                        if (!acc[issueKey]) {
                          acc[issueKey] = {
                            issue: item.issue,
                            dimension: item.dimension,
                            pages: []
                          };
                        }
                        
                        acc[issueKey].pages.push({
                          source: item.source,
                          sourceType: item.sourceType,
                          title: item.pageTitle
                        });
                        
                        return acc;
                      }, {} as Record<string, { issue: any; dimension: string; pages: Array<{ source: string; sourceType: string; title?: string }> }>);

                      // Convert to array and sort by severity
                      const sortedGroupedIssues = Object.entries(groupedIssues).sort((a, b) => {
                        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                        const severityA = severityOrder[a[1].issue.severity as keyof typeof severityOrder] ?? 4;
                        const severityB = severityOrder[b[1].issue.severity as keyof typeof severityOrder] ?? 4;
                        return severityA - severityB;
                      });

                      if (sortedGroupedIssues.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="text-center py-8">
                              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                              <p className="text-lg font-semibold text-gray-900">All Clear!</p>
                              <p className="text-sm text-gray-600">Excellent! Your content is performing well with no issues to address.</p>
                            </td>
                          </tr>
                        );
                      }

                      return sortedGroupedIssues.map(([issueKey, groupedIssue], index) => {
                        const Icon = SEVERITY_ICONS[groupedIssue.issue.severity as keyof typeof SEVERITY_ICONS] || Info;
                        const severityColor = SEVERITY_COLORS[groupedIssue.issue.severity as keyof typeof SEVERITY_COLORS] || '#6b7280';
                        
                        return (
                          <tr 
                            key={issueKey} 
                            className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => handleOpenGuide(groupedIssue.issue.description, groupedIssue.dimension.toLowerCase(), groupedIssue.issue.severity)}
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
                                  {groupedIssue.issue.severity}
                                </Badge>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div 
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                                style={{ 
                                  backgroundColor: `${getDimensionColor(groupedIssue.dimension)}15`,
                                  color: getDimensionColor(groupedIssue.dimension),
                                  border: `1px solid ${getDimensionColor(groupedIssue.dimension)}30`
                                }}
                              >
                                {groupedIssue.dimension}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <p className="text-sm text-gray-900 font-medium">
                                  {groupedIssue.issue.recommendation || groupedIssue.issue.description}
                                </p>
                                {groupedIssue.issue.recommendation && groupedIssue.issue.ruleName && (
                                  <p className="text-xs text-gray-600">{groupedIssue.issue.ruleName}</p>
                                )}
                                {!groupedIssue.issue.recommendation && groupedIssue.issue.ruleName && (
                                  <p className="text-xs text-gray-600">{groupedIssue.issue.ruleName}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {groupedIssue.pages.length} {groupedIssue.pages.length === 1 ? 'page' : 'pages'}
                                  </Badge>
                                </div>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button 
                                        className="text-xs text-gray-500 font-medium hover:text-gray-700 cursor-pointer"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        +view {groupedIssue.pages.length}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-md">
                                      <div className="space-y-1">
                                        <p className="font-medium text-sm">Affected pages:</p>
                                        {groupedIssue.pages.map((page, idx) => (
                                          <div key={idx} className="text-xs">
                                            {page.sourceType === 'page' ? (
                                              <a
                                                href={page.source}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline flex items-center gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {page.title || formatUrlForDisplay(page.source, 50)}
                                                <ExternalLink className="h-2.5 w-2.5" />
                                              </a>
                                            ) : (
                                              <span className="text-gray-700">{page.source}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary" className="text-xs">
                                {groupedIssue.pages.every(p => p.sourceType === 'domain') ? 'Domain' : 
                                 groupedIssue.pages.some(p => p.sourceType === 'domain') ? 'Mixed' : 'Pages'}
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
              title: page.title, // Now ContentScore has title field
              globalScore: page.globalScore,
              scores: page.scores, // Already in correct format
              ruleResults: (page.ruleResults || []).map(rule => ({
                ...rule,
                evidence: rule.evidence.map(e => 
                  typeof e === 'string' ? { type: 'info' as const, content: e } : e
                )
              })), // Transform evidence to EvidenceItem[]
              details: page.details, // Pass the LLM analysis details
              calculationDetails: page.calculationDetails, // Pass calculation breakdowns
              issues: page.issues || [], // Already in correct format
              strengths: [
                ...(page.scores?.authority >= 80 ? ['Strong Authority Signals'] : []),
                ...(page.scores?.structure >= 80 ? ['Quality Content'] : []),
                ...(page.scores?.technical >= 80 ? ['Well Structured'] : []),
                ...(page.scores?.quality >= 80 ? ['Strong Quality Content'] : []),
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