import { apiFetch } from "./utils";

export interface CrawlConfig {
  rootUrl?: string;
  config: {
    maxPages: number;
    maxDepth: number;
    allowedDomains?: string[];
    excludePatterns?: string[];
    respectRobotsTxt?: boolean;
    crawlDelay?: number;
  };
}

export interface ScanConfig {
  config: {
    queries?: string[];
    querySource: 'manual' | 'generated' | 'search_console';
    maxResults?: number;
    useHybridSearch?: boolean;
    generateQueryCount?: number;
  };
}

export interface AIVisibilityStatus {
  crawl?: {
    totalPages: number;
    successfulPages: number;
    failedPages: number;
    urls: string[];
    isActive?: boolean;
    currentUrl?: string | null;
    queueSize?: number;
  };
  indexes?: {
    bm25?: {
      id: string;
      status: string;
      chunkCount: number;
      createdAt: string;
      configuration: any;
    };
    vector?: {
      id: string;
      status: string;
      chunkCount: number;
      createdAt: string;
      configuration: any;
    };
  };
  scans?: Array<{
    scanId: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    configuration: any;
    coverageMetrics?: any;
    visibilityPatterns?: any;
    overallStats?: any;
    recommendations?: any[];
    totalQueries: number;
  }>;
}

export async function getAIVisibilityStatus(
  projectId: string,
  token: string
): Promise<AIVisibilityStatus> {
  const [crawlStatus, indexStatus, scans] = await Promise.all([
    apiFetch<any>(`/ai-visibility/crawl/${projectId}/status`, {
      method: "GET",
      token,
    }),
    apiFetch<any>(`/ai-visibility/index/${projectId}/status`, {
      method: "GET",
      token,
    }),
    apiFetch<any>(`/ai-visibility/scan/${projectId}/results`, {
      method: "GET",
      token,
    }),
  ]);

  return {
    crawl: crawlStatus,
    indexes: indexStatus,
    scans: scans.scans || [],
  };
}

export async function startCrawl(
  projectId: string,
  config: CrawlConfig,
  token: string
): Promise<any> {
  return apiFetch(`/ai-visibility/crawl/${projectId}`, {
    method: "POST",
    body: JSON.stringify(config),
    token,
  });
}

export async function getCrawledPages(
  projectId: string,
  token: string
): Promise<any> {
  return apiFetch(`/ai-visibility/crawl/${projectId}/pages`, {
    method: "GET",
    token,
  });
}

export async function buildIndexes(
  projectId: string,
  token: string
): Promise<any> {
  return apiFetch(`/ai-visibility/index/${projectId}/build`, {
    method: "POST",
    token,
  });
}

export async function testSearch(
  projectId: string,
  query: string,
  maxResults: number,
  token: string
): Promise<any> {
  return apiFetch(`/ai-visibility/index/${projectId}/search`, {
    method: "POST",
    body: JSON.stringify({ query, maxResults }),
    token,
  });
}

export async function executeScan(
  projectId: string,
  config: ScanConfig,
  token: string
): Promise<any> {
  return apiFetch(`/ai-visibility/scan/${projectId}/execute`, {
    method: "POST",
    body: JSON.stringify(config),
    token,
  });
}

export async function getScanResults(
  projectId: string,
  scanId: string,
  token: string
): Promise<any> {
  return apiFetch(`/ai-visibility/scan/${projectId}/results/${scanId}`, {
    method: "GET",
    token,
  });
}

export async function getRecommendations(
  projectId: string,
  scanId: string,
  token: string
): Promise<any> {
  return apiFetch(`/ai-visibility/scan/${projectId}/recommendations/${scanId}`, {
    method: "GET",
    token,
  });
}

export async function generateActionPlan(
  projectId: string,
  scanId: string,
  token: string
): Promise<any> {
  return apiFetch(`/ai-visibility/action-plans/${projectId}/generate/${scanId}`, {
    method: "POST",
    token,
  });
}

export async function previewActionPlan(
  projectId: string,
  scanId: string,
  token: string
): Promise<any> {
  return apiFetch(`/ai-visibility/action-plans/${projectId}/preview/${scanId}`, {
    method: "GET",
    token,
  });
}

export async function getActionPlan(
  projectId: string,
  scanId: string,
  token: string
): Promise<any> {
  return apiFetch(`/ai-visibility/action-plans/${projectId}/scan/${scanId}`, {
    method: "GET",
    token,
  });
}

export async function getLatestActionPlan(
  projectId: string,
  token: string
): Promise<any> {
  return apiFetch(`/ai-visibility/action-plans/${projectId}/latest`, {
    method: "GET",
    token,
  });
}

export async function updateActionItem(
  projectId: string,
  scanId: string,
  itemId: string,
  completed: boolean,
  token: string
): Promise<any> {
  return apiFetch(`/ai-visibility/action-plans/${projectId}/scan/${scanId}/item/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ completed }),
    token,
  });
}