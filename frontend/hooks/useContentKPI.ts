import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

export interface ContentScore {
  url: string;
  globalScore: number;
  scores: {
    authority: number;
    freshness: number;
    structure: number;
    snippetExtractability: number;
    brandAlignment: number;
  };
  issues: Array<{
    dimension: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
  analyzedAt: string;
}

export interface ContentKPIStats {
  totalPages: number;
  avgGlobalScore: number;
  avgAuthorityScore: number;
  avgFreshnessScore: number;
  avgStructureScore: number;
  avgSnippetScore: number;
  avgBrandScore: number;
  scoreDistribution: Array<{
    _id: string;
    count: number;
  }>;
  issuesSummary: Array<{
    _id: string;
    totalIssues: number;
    severities: Array<{
      severity: string;
      count: number;
    }>;
  }>;
}

export interface ContentKPIReport {
  summary: {
    totalPages: number;
    avgGlobalScore: number;
    scoreBreakdown: {
      authority: number;
      freshness: number;
      structure: number;
      snippetExtractability: number;
      brandAlignment: number;
    };
    lastAnalyzedAt: string | null;
  };
  scoreDistribution: any[];
  topPerformingPages: Array<{
    url: string;
    globalScore: number;
    strengths: string[];
  }>;
  lowPerformingPages: Array<{
    url: string;
    globalScore: number;
    topIssues: any[];
  }>;
  issuesSummary: any[];
  criticalIssuesCount: number;
  recommendations: string[];
}

export function useContentKPI(projectId: string) {
  const [data, setData] = useState<{
    scores: ContentScore[];
    stats: ContentKPIStats;
  } | null>(null);
  const [report, setReport] = useState<ContentKPIReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { token } = useAuth();

  const fetchContentScores = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await apiFetch(`/user/projects/${projectId}/crawler/content-scores`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setData(response);
    } catch (err: any) {
      setError(err as Error);
      // If 404, set empty data
      if (err.status === 404 || err.message?.includes('404')) {
        setData({
          scores: [],
          stats: {
            totalPages: 0,
            avgGlobalScore: 0,
            avgAuthorityScore: 0,
            avgFreshnessScore: 0,
            avgStructureScore: 0,
            avgSnippetScore: 0,
            avgBrandScore: 0,
            scoreDistribution: [],
            issuesSummary: [],
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchContentReport = async () => {
    if (!token) return;
    try {
      const response = await apiFetch(`/user/projects/${projectId}/crawler/content-scores/report`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setReport(response);
    } catch (err: any) {
      console.error('Failed to fetch content report:', err);
      // If 404, it means no crawl has run yet - set empty report
      if (err.status === 404 || err.message?.includes('404')) {
        setReport({
          summary: {
            totalPages: 0,
            avgGlobalScore: 0,
            scoreBreakdown: {
              authority: 0,
              freshness: 0,
              structure: 0,
              snippetExtractability: 0,
              brandAlignment: 0,
            },
            lastAnalyzedAt: null,
          },
          scoreDistribution: [],
          topPerformingPages: [],
          lowPerformingPages: [],
          issuesSummary: [],
          criticalIssuesCount: 0,
          recommendations: [],
        });
      }
    }
  };

  const triggerCrawl = async (options?: { maxPages?: number; crawlDelay?: number }) => {
    if (!token) throw new Error('Not authenticated');
    try {
      const response = await apiFetch(`/user/projects/${projectId}/crawler/crawl`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options || {}),
      });
      return response;
    } catch (err) {
      throw err;
    }
  };

  const getCrawlStatus = async () => {
    if (!token) throw new Error('Not authenticated');
    try {
      const response = await apiFetch(`/user/projects/${projectId}/crawler/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    if (projectId && token) {
      fetchContentScores();
      fetchContentReport();
    }
  }, [projectId, token]);

  return {
    data,
    report,
    loading,
    error,
    refetch: fetchContentScores,
    triggerCrawl,
    getCrawlStatus,
  };
}