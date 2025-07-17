'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  AlertTriangle, CheckCircle, Info, AlertCircle,
  ExternalLink, TrendingUp, Globe, Calendar, Users
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { API_BASE_URL } from '@/lib/api/constants';
import { DIMENSION_COLORS } from '@/lib/constants/colors';
import { PageAnalysisTable } from './PageAnalysisTable';
import { Recommendation } from '@/hooks/useContentKPI';
import { DonutChart } from './DonutChart';
import { DomainIssuesDrawer } from './DomainIssuesDrawer';

interface DomainAnalysisTabProps {
  projectId: string;
  onIssueClick?: (issue: any) => void;
}

interface DomainAnalysis {
  domain: string;
  overallScore: number;
  analysisResults: {
    technical: {
      score: number;
      maxScore: number;
      evidence: any[];
      details: any;
      issues: any[];
    };
    structure: {
      score: number;
      maxScore: number;
      evidence: any[];
      details: any;
      issues: any[];
    };
    authority: {
      score: number;
      maxScore: number;
      evidence: any[];
      details: any;
      issues: any[];
    };
    quality: {
      score: number;
      maxScore: number;
      evidence: any[];
      details: any;
      issues: any[];
    };
  };
  ruleResults: any[];
  issues: string[];
  recommendations: string[] | Recommendation[];
  calculationDetails: any;
  metadata: {
    totalPages: number;
    pagesAnalyzed: string[];
    analysisStartedAt: string;
    analysisCompletedAt: string;
    llmCallsMade: number;
  };
}

interface DomainAnalysisData {
  domainAnalyses: DomainAnalysis[];
  totalDomains: number;
}

const COLORS = DIMENSION_COLORS;

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

export function DomainAnalysisTab({ projectId, onIssueClick }: DomainAnalysisTabProps) {
  const { token } = useAuth();
  const [data, setData] = useState<DomainAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainIssuesDrawerOpen, setDomainIssuesDrawerOpen] = useState(false);
  const [allDomainIssues, setAllDomainIssues] = useState<any[]>([]);

  const fetchDomainAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/user/projects/${projectId}/crawler/domain-analysis`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch domain analysis');
      }

      const result = await response.json();
      setData(result);
      setError(null);
      
      // Set all domain issues for the drawer
      if (result && result.domainAnalyses) {
        const allIssues = result.domainAnalyses.flatMap((domain: any) => {
          // First, collect issues from ruleResults that have issues
          const ruleIssues = (domain.ruleResults || [])
            .filter((result: any) => result.issues && result.issues.length > 0)
            .flatMap((result: any) => 
              result.issues.map((issue: any, issueIndex: number) => ({
                id: issue.id || `${domain.domain}-${result.ruleId}-issue-${issueIndex}`,
                domain: domain.domain,
                description: issue.description,
                severity: issue.severity || 'medium',
                dimension: result.category?.toLowerCase() || 'technical',
                recommendation: issue.recommendation,
                ruleId: result.ruleId,
                ruleName: result.ruleName
              }))
            );
          
          // If we have rule issues, use them
          if (ruleIssues.length > 0) {
            return ruleIssues;
          }
          
          // Otherwise, convert the domain-level string issues
          return (domain.issues || []).map((issue: string | any, index: number) => {
            if (typeof issue === 'string') {
              // Try to determine dimension from the issue text
              let dimension = 'authority'; // Default for domain-level issues
              const issueLower = issue.toLowerCase();
              
              if (issueLower.includes('technical') || issueLower.includes('mobile') || issueLower.includes('https')) {
                dimension = 'technical';
              } else if (issueLower.includes('structure') || issueLower.includes('content')) {
                dimension = 'structure';
              } else if (issueLower.includes('monitoring') || issueLower.includes('kpi') || issueLower.includes('quality')) {
                dimension = 'quality';
              }
              
              return {
                id: `${domain.domain}-issue-${index}`,
                domain: domain.domain,
                description: issue,
                severity: 'medium' as const,
                dimension,
              };
            }
            return { ...issue, domain: domain.domain }; // Already an object, add domain
          });
        });
        setAllDomainIssues(allIssues);
      }
    } catch (err) {
      console.error('Error fetching domain analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to load domain analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && projectId) {
      fetchDomainAnalysis();
    }
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

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Domain Analysis</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.domainAnalyses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Domain Analysis Available</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Domain analysis will be available after running content analysis. 
            This analyzes domain-level factors like authority and reputation.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall domain metrics
  const avgDomainScore = data.domainAnalyses.length > 0 ? Math.round(
    data.domainAnalyses.reduce((sum, domain) => sum + (domain.overallScore || 0), 0) / data.domainAnalyses.length
  ) : 0;

  const totalPages = data.domainAnalyses.reduce((sum, domain) => sum + (domain.metadata?.totalPages || 0), 0);
  const totalIssues = data.domainAnalyses.reduce((sum, domain) => sum + (domain.issues?.length || 0), 0);

  // Prepare radar chart data for average domain scores
  const avgDimensionScores = data.domainAnalyses.reduce((acc, domain) => {
    if (domain.analysisResults) {
      Object.entries(domain.analysisResults).forEach(([dimension, data]) => {
        if (!acc[dimension]) {
          acc[dimension] = { total: 0, count: 0 };
        }
        acc[dimension].total += (data as any).score;
        acc[dimension].count += 1;
      });
    }
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const radarData = Object.entries(avgDimensionScores).map(([dimension, data]) => ({
    dimension: dimension.charAt(0).toUpperCase() + dimension.slice(1),
    value: Math.round(data.total / data.count),
  }));

  // Prepare domain scores for bar chart
  const domainScoreData = data.domainAnalyses.map(domain => ({
    domain: domain.domain.replace(/^www\./, ''),
    score: domain.overallScore || 0,
    pages: domain.metadata?.totalPages || 0,
  }));

  // Collect all issues from all domains
  const allIssues = data.domainAnalyses.flatMap(domain => {
    // First, collect issues from ruleResults that have issues
    const ruleIssues = (domain.ruleResults || [])
      .filter((result: any) => result.issues && result.issues.length > 0)
      .flatMap((result: any) => 
        result.issues.map((issue: any, issueIndex: number) => ({
          id: issue.id || `${domain.domain}-${result.ruleId}-issue-${issueIndex}`,
          domain: domain.domain,
          description: issue.description,
          severity: issue.severity || 'medium',
          dimension: result.category?.toLowerCase() || 'technical',
          recommendation: issue.recommendation,
          ruleId: result.ruleId,
          ruleName: result.ruleName
        }))
      );
    
    // If we have rule issues, use them
    if (ruleIssues.length > 0) {
      return ruleIssues;
    }
    
    // Otherwise, convert the domain-level string issues
    return (domain.issues || []).map((issue: string | any, index: number) => {
      if (typeof issue === 'string') {
        // Try to determine dimension from the issue text
        let dimension = 'authority'; // Default for domain-level issues
        const issueLower = issue.toLowerCase();
        
        if (issueLower.includes('technical') || issueLower.includes('mobile') || issueLower.includes('https')) {
          dimension = 'technical';
        } else if (issueLower.includes('structure') || issueLower.includes('content')) {
          dimension = 'structure';
        } else if (issueLower.includes('monitoring') || issueLower.includes('kpi') || issueLower.includes('quality')) {
          dimension = 'quality';
        }
        
        return {
          id: `${domain.domain}-issue-${index}`,
          domain: domain.domain,
          description: issue,
          severity: 'medium' as const,
          dimension,
        };
      }
      return { ...issue, domain: domain.domain }; // Already an object, add domain
    });
  });

  // Group issues by severity
  const criticalIssues = allIssues.filter(issue => issue.severity === 'critical');
  const highIssues = allIssues.filter(issue => issue.severity === 'high');
  const mediumIssues = allIssues.filter(issue => issue.severity === 'medium');
  const lowIssues = allIssues.filter(issue => issue.severity === 'low');

  const SEVERITY_ICONS = {
    critical: AlertCircle,
    high: AlertTriangle,
    medium: Info,
    low: CheckCircle,
  };

  const SEVERITY_COLORS = {
    critical: 'text-red-600',
    high: 'text-orange-600',
    medium: 'text-yellow-600',
    low: 'text-blue-600',
  };

  return (
    <div className="space-y-6">
      {/* Donut Charts Section - Domain-specific */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-5">
            <DonutChart
              score={avgDomainScore}
              color="#6366f1"
              title="Overall"
            />
            <DonutChart
              score={Math.round(avgDimensionScores.technical?.total / avgDimensionScores.technical?.count || 0)}
              dimension="technical"
              title="Technical"
            />
            <DonutChart
              score={Math.round(avgDimensionScores.authority?.total / avgDimensionScores.authority?.count || 0)}
              dimension="authority"
              title="Authority"
            />
            <DonutChart
              score={Math.round(avgDimensionScores.structure?.total / avgDimensionScores.structure?.count || 0)}
              dimension="structure"
              title="Structure"
            />
            <DonutChart
              score={Math.round(avgDimensionScores.quality?.total / avgDimensionScores.quality?.count || 0)}
              dimension="quality"
              title="Quality"
            />
          </div>
        </CardContent>
      </Card>


      {/* Domain Analysis Table */}
      <PageAnalysisTable 
        pages={data.domainAnalyses.map(domain => ({
        url: domain.domain,
        title: domain.domain,
        globalScore: domain.overallScore || 0,
        scores: domain.analysisResults ? {
          technical: Math.round(domain.analysisResults.technical?.score || 0),
          structure: Math.round(domain.analysisResults.structure?.score || 0),
          authority: Math.round(domain.analysisResults.authority?.score || 0),
          quality: Math.round(domain.analysisResults.quality?.score || 0),
        } : {
          technical: 0,
          structure: 0,
          authority: 0,
          quality: 0,
        },
        ruleResults: domain.ruleResults || [],
        issues: (() => {
          // First, collect issues from ruleResults that have issues
          const ruleIssues = (domain.ruleResults || [])
            .filter((result: any) => result.issues && result.issues.length > 0)
            .flatMap((result: any) => 
              result.issues.map((issue: any, issueIndex: number) => ({
                id: `${domain.domain}-${result.ruleId}-issue-${issueIndex}`,
                description: issue.description,
                severity: issue.severity || 'medium',
                dimension: result.category?.toLowerCase() || 'technical',
                recommendation: issue.recommendation
              }))
            );
          
          // If we have rule issues, use them
          if (ruleIssues.length > 0) {
            return ruleIssues;
          }
          
          // Otherwise, convert the domain-level string issues
          return (domain.issues || []).map((issue: string | any, index: number) => {
            if (typeof issue === 'string') {
              // Try to determine dimension from the issue text
              let dimension = 'authority'; // Default for domain-level issues
              const issueLower = issue.toLowerCase();
              
              if (issueLower.includes('technical') || issueLower.includes('mobile') || issueLower.includes('https')) {
                dimension = 'technical';
              } else if (issueLower.includes('structure') || issueLower.includes('content')) {
                dimension = 'structure';
              } else if (issueLower.includes('monitoring') || issueLower.includes('kpi') || issueLower.includes('quality')) {
                dimension = 'quality';
              }
              
              return {
                id: `${domain.domain}-issue-${index}`,
                description: issue,
                severity: 'medium' as const,
                dimension,
              };
            }
            return issue; // Already an object
          });
        })(),
        crawledAt: new Date(domain.metadata?.analysisCompletedAt || Date.now()),
        pageCategory: 'domain' as any,
        analysisLevel: 'domain' as any,
        categoryConfidence: 100,
        skipped: false,
      }))}
      projectId={projectId}
      isDomainAnalysis={true}
      onDomainIssuesClick={() => setDomainIssuesDrawerOpen(true)}
      totalDomainIssues={allDomainIssues.length}
      />
      
      {/* Domain Issues Drawer */}
      <DomainIssuesDrawer
        isOpen={domainIssuesDrawerOpen}
        onClose={() => setDomainIssuesDrawerOpen(false)}
        issues={allDomainIssues}
        onIssueClick={onIssueClick}
      />
    </div>
  );
}