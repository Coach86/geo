'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line
} from 'recharts';
import { 
  TrendingUp, Globe, FileText, BarChart3, Target, Layers
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { API_BASE_URL } from '@/lib/api/constants';

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
    content: number;
    authority: number;
    monitoringKpi: number;
  };
  domainScoreBreakdown: Record<string, number[]>;
  pageScores: any[];
  domainAnalyses: any[];
}

const COLORS = {
  technical: '#3b82f6',
  content: '#10b981',
  authority: '#8b5cf6',
  monitoringKpi: '#f59e0b',
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
      dimension: dimension === 'monitoringKpi' ? 'Monitoring' : dimension.charAt(0).toUpperCase() + dimension.slice(1),
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
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Combined Score</CardTitle>
            <Target className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-gray-900">{Math.round(data.combined.overallScore)}/100</div>
            <div className="text-xs text-gray-500">
              <span className={categoryColor(data.combined.overallScore)}>
                {getScoreCategory(data.combined.overallScore)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Page Score</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-gray-900">{Math.round(data.combined.pageScore)}/100</div>
            <p className="text-xs text-gray-500">
              60% weight • {data.combined.totalPages} pages
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Domain Score</CardTitle>
            <Globe className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-gray-900">{Math.round(data.combined.domainScore)}/100</div>
            <p className="text-xs text-gray-500">
              40% weight • {data.combined.totalDomains} domains
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Analysis Scope</CardTitle>
            <Layers className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-gray-900">{data.combined.totalPages + data.combined.totalDomains}</div>
            <p className="text-xs text-gray-500">
              Total entities analyzed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Score Composition and Page Analysis in same row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Score Composition */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Score Composition</CardTitle>
            <p className="text-sm text-gray-500">
              How page-level and domain-level analysis contribute to the overall score
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comparisonData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: index === 0 ? COLORS.page : COLORS.domain }}
                      />
                      <span className="font-medium">{item.category}</span>
                      <Badge variant="outline">{item.weight}% weight</Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{Math.round(item.score)}/100</div>
                      <div className="text-xs text-muted-foreground">
                        Contributes {item.contribution} points
                      </div>
                    </div>
                  </div>
                  <Progress value={item.score} className="h-2" />
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Final Combined Score</span>
                  <span className="text-xl font-bold">{Math.round(data.combined.overallScore)}/100</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Page Analysis Breakdown */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Page Analysis Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.pageScoreBreakdown || {}).map(([dimension, score]) => (
                <div key={dimension} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">
                      {dimension === 'monitoringKpi' ? 'Monitoring KPI' : dimension}
                    </span>
                    <span className="font-medium">{Math.round(score)}/100</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Methodology */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Scoring Methodology</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2 text-gray-900">Combined Score Calculation</h4>
              <p className="text-gray-600">
                The combined score is calculated as a weighted average: (Page Score × 60%) + (Domain Score × 40%).
                This gives more weight to page-level content quality while considering domain-level authority factors.
              </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2 text-gray-900">Page Analysis (60% weight)</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Content freshness and update frequency</li>
                  <li>• HTML structure and technical SEO</li>
                  <li>• Brand alignment and messaging</li>
                  <li>• Individual page authority signals</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 text-gray-900">Domain Analysis (40% weight)</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Domain authority and reputation</li>
                  <li>• Overall site architecture quality</li>
                  <li>• Cross-domain consistency</li>
                  <li>• External authority signals</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}