'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line
} from 'recharts';
import { 
  TrendingUp, Globe, FileText, BarChart3, Target, Layers
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/persistent-tooltip';
import { useAuth } from '@/providers/auth-provider';
import { API_BASE_URL } from '@/lib/api/constants';
import { DIMENSION_ORDER, getDimensionColor, getDimensionDisplayName } from '@/lib/constants/dimensions';

interface CombinedScoresTabProps {
  projectId: string;
}

interface CombinedScoresData {
  combined: {
    overallScore: number;
    pageScore: number;
    domainScore: number;
    totalPages: number;
    totalDomains: number;
  };
  pageScoreBreakdown: {
    technical: number;
    structure: number;
    authority: number;
    quality: number;
  };
  domainScoreBreakdown: Record<string, number[]>;
  pageScores: any[];
  domainAnalyses: any[];
}

const CHART_COLORS = {
  domain: '#f59e0b',
  page: '#6366f1',
};

export function CombinedScoresTab({ projectId }: CombinedScoresTabProps) {
  const { token } = useAuth();
  const [data, setData] = useState<CombinedScoresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCombinedScores = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/user/projects/${projectId}/crawler/combined-scores`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch combined scores');
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching combined scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to load combined scores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && projectId) {
      fetchCombinedScores();
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

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Combined Score Data</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {error || 'Combined scores will be available after running both page and domain analysis.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare comparison data for page vs domain
  const comparisonData = [
    {
      category: 'Page Analysis',
      score: data.combined.pageScore,
      weight: 60,
      contribution: Math.round(data.combined.pageScore * 0.6),
    },
    {
      category: 'Domain Analysis', 
      score: data.combined.domainScore,
      weight: 40,
      contribution: Math.round(data.combined.domainScore * 0.4),
    },
  ];

  // Prepare dimension comparison (page vs domain)
  const dimensionComparison = Object.keys(data.pageScoreBreakdown).map(dimension => {
    const pageScore = data.pageScoreBreakdown[dimension as keyof typeof data.pageScoreBreakdown];
    const domainScores = data.domainScoreBreakdown[dimension] || [];
    const avgDomainScore = domainScores.length > 0 
      ? Math.round(domainScores.reduce((sum, score) => sum + score, 0) / domainScores.length)
      : 0;

    return {
      dimension: getDimensionDisplayName(dimension),
      pageScore,
      domainScore: avgDomainScore,
    };
  });

  // Prepare overall radar data
  const radarData = dimensionComparison.map(item => ({
    dimension: item.dimension,
    value: Math.round((item.pageScore * 0.6) + (item.domainScore * 0.4)), // Combined weighted score
  }));

  // Calculate score distribution
  const getScoreCategory = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Poor';
    return 'Critical';
  };

  const categoryColor = (score: number) => {
    if (score >= 80) return 'text-accent';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Combined Score
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Weighted average of page and domain scores</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600">
                    {Math.round(data.combined.overallScore)}%
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {getScoreCategory(data.combined.overallScore)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="h-5 w-5 text-amber-600" />
                Domain Score
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Overall domain authority and technical setup</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600">
                    {Math.round(data.combined.domainScore)}%
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {getScoreCategory(data.combined.domainScore)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Page Score
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Average score across all analyzed pages</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600">
                    {Math.round(data.combined.pageScore)}%
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {getScoreCategory(data.combined.pageScore)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-600" />
                Analysis Scope
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total number of entities analyzed</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600">
                    {data.combined.totalPages + data.combined.totalDomains}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {data.combined.totalPages} pages • {data.combined.totalDomains} domains
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Breakdown only - removed Score Composition */}
      <div className="grid gap-4 md:grid-cols-1">

        {/* Breakdown */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Domain Breakdown */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Domain Scores</h4>
                {Object.keys(data.domainScoreBreakdown || {}).length > 0 ? (
                  <div className="space-y-3">
                    {DIMENSION_ORDER.map((dimension) => {
                      const scores = data.domainScoreBreakdown[dimension] || [];
                      if (!scores || scores.length === 0) return null;
                      const color = getDimensionColor(dimension);
                      const avgScore = Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length);
                      return (
                        <div key={dimension} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: color }}
                              />
                              <span>
                                {getDimensionDisplayName(dimension)}
                              </span>
                            </div>
                            <span className="font-medium">{avgScore}/100</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-300"
                              style={{ 
                                backgroundColor: color,
                                width: `${Math.min(100, Math.max(0, avgScore))}%`
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Globe className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No domain analysis data available</p>
                    <p className="text-xs text-gray-400 mt-1">Domain scores will appear after running domain analysis</p>
                  </div>
                )}
              </div>

              {/* Page Breakdown */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Page Scores</h4>
                <div className="space-y-3">
                  {DIMENSION_ORDER.map((dimension) => {
                    const score = data.pageScoreBreakdown[dimension as keyof typeof data.pageScoreBreakdown];
                    if (score === undefined || score === null) return null;
                    const color = getDimensionColor(dimension);
                    return (
                      <div key={dimension} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: color }}
                            />
                            <span>
                              {getDimensionDisplayName(dimension)}
                            </span>
                          </div>
                          <span className="font-medium">{Math.round(score)}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              backgroundColor: color,
                              width: `${Math.min(100, Math.max(0, score))}%`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      </div>
    </TooltipProvider>
  );
}