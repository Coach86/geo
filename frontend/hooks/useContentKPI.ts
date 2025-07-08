import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

export interface ContentScore {
  url: string;
  title?: string;
  globalScore: number;
  scores: {
    technical: number;
    structure: number;
    authority: number;
    quality: number;
  };
  ruleResults?: Array<{
    ruleId: string;
    ruleName: string;
    category: 'technical' | 'structure' | 'authority' | 'quality';
    score: number;
    maxScore: number;
    weight: number;
    contribution: number;
    passed: boolean;
    evidence: string[];
    issues?: Array<{
      dimension: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
      affectedElements?: string[];
    }>;
    details?: Record<string, any>;
  }>;
  details?: {
    authority: {
      hasAuthor: boolean;
      authorName?: string;
      authorCredentials: string[];
      outboundCitations: number;
      trustedCitations: string[];
      domainAuthority?: 'low' | 'medium' | 'high' | 'unknown';
      citationCount?: number;
    };
    freshness: {
      publishDate?: string;
      modifiedDate?: string;
      daysSinceUpdate?: number;
      hasDateSignals: boolean;
    };
    structure: {
      h1Count: number;
      headingHierarchy: boolean;
      headingHierarchyScore?: number;
      schemaTypes: string[];
      avgSentenceWords: number;
    };
    brand: {
      brandKeywordMatches: number;
      requiredTermsFound: string[];
      outdatedTermsFound: string[];
      brandConsistency: number;
      brandMentions?: number; // Added for LLM analysis
      alignmentIssues?: string[];
      consistencyScore?: number;
      missingKeywords?: string[];
    };
  };
  calculationDetails?: {
    authority?: {
      formula: string;
      subScores: Array<{
        name: string;
        value: number;
        weight: number;
        maxValue: number;
        contribution: number;
        evidence?: string | string[];
      }>;
      finalScore: number;
      explanation: string;
    };
    freshness?: {
      formula: string;
      subScores: Array<{
        name: string;
        value: number;
        weight: number;
        maxValue: number;
        contribution: number;
        evidence?: string | string[];
      }>;
      finalScore: number;
      explanation: string;
    };
    structure?: {
      formula: string;
      subScores: Array<{
        name: string;
        value: number;
        weight: number;
        maxValue: number;
        contribution: number;
        evidence?: string | string[];
      }>;
      finalScore: number;
      explanation: string;
    };
    brandAlignment?: {
      formula: string;
      subScores: Array<{
        name: string;
        value: number;
        weight: number;
        maxValue: number;
        contribution: number;
        evidence?: string | string[];
      }>;
      finalScore: number;
      explanation: string;
    };
  };
  issues: Array<{
    id?: string;
    dimension: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
    affectedElements?: string[];
    ruleId?: string;
    ruleName?: string;
  }>;
  analyzedAt: string;
  pageCategory?: string;
  analysisLevel?: string;
  categoryConfidence?: number;
  skipped?: boolean;
  skipReason?: string;
}

export interface ContentKPIStats {
  totalPages: number;
  avgGlobalScore: number;
  avgTechnicalScore: number;
  avgStructureScore: number;
  avgAuthorityScore: number;
  avgQualityScore: number;
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

export interface Recommendation {
  content: string;
  ruleId: string;
  ruleCategory: string;
}

export interface ContentKPIReport {
  summary: {
    totalPages: number;
    avgGlobalScore: number;
    scoreBreakdown: {
      technical: number;
      structure: number;
      authority: number;
      quality: number;
    };
    lastAnalyzedAt: string | null;
  };
  scoreDistribution: any[];
  topPerformingPages: Array<{
    url: string;
    title?: string;
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
  recommendations: string[] | Recommendation[];
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
      interface ContentScoresResponse {
        scores: ContentScore[];
        stats: ContentKPIStats;
      }
      const typedResponse = response as ContentScoresResponse;
      setData(typedResponse);
    } catch (err: any) {
      setError(err as Error);
      // If 404, set empty data
      if (err.status === 404 || err.message?.includes('404')) {
        setData({
          scores: [],
          stats: {
            totalPages: 0,
            avgGlobalScore: 0,
            avgTechnicalScore: 0,
            avgStructureScore: 0,
            avgAuthorityScore: 0,
            avgQualityScore: 0,
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
      const typedResponse = response as ContentKPIReport;
      setReport(typedResponse);
    } catch (err: any) {
      console.error('Failed to fetch content report:', err);
      // If 404, it means no crawl has run yet - set empty report
      if (err.status === 404 || err.message?.includes('404')) {
        setReport({
          summary: {
            totalPages: 0,
            avgGlobalScore: 0,
            scoreBreakdown: {
              technical: 0,
              structure: 0,
              authority: 0,
              quality: 0,
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

  const triggerCrawl = async (options?: { 
    maxPages?: number; 
    crawlDelay?: number;
    userAgent?: string;
    includePatterns?: string[];
    excludePatterns?: string[];
    mode?: 'auto' | 'manual';
    manualUrls?: string[];
  }) => {
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

  const getCrawlStatus = async (): Promise<{
    isActive: boolean;
    crawledPages?: number;
    totalPages?: number;
  }> => {
    if (!token) throw new Error('Not authenticated');
    try {
      const response = await apiFetch(`/user/projects/${projectId}/crawler/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      interface CrawlStatusResponse {
        isActive: boolean;
        crawledPages?: number;
        totalPages?: number;
      }
      return response as CrawlStatusResponse;
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

  const refetch = async () => {
    await Promise.all([
      fetchContentScores(),
      fetchContentReport()
    ]);
  };

  return {
    data,
    report,
    loading,
    error,
    refetch,
    triggerCrawl,
    getCrawlStatus,
  };
}