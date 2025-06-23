/**
 * Brand Report API
 */

import { API_ENDPOINTS } from './constants';
import { apiFetch } from './utils';
import { BatchResult, CitationsData, SpontaneousData, AlignmentData } from './types';
import { ReportResponse } from '../../types/reports';

/**
 * Get all reports for a project (requires token authentication)
 */
export async function getProjectReports(
  projectId: string,
  token: string
): Promise<ReportResponse[]> {
  try {
    return await apiFetch<ReportResponse[]>(
      API_ENDPOINTS.BRAND_REPORTS.BY_PROJECT(projectId),
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get project reports error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get project reports'
    );
  }
}

/**
 * Get batch results for a report (requires token authentication)
 */
export async function getBatchResults(
  reportId: string,
  token: string
): Promise<BatchResult[]> {
  try {
    return await apiFetch<BatchResult[]>(
      API_ENDPOINTS.BATCH_RESULTS.BY_REPORT(reportId),
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get batch results error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get batch results'
    );
  }
}

/**
 * Get explorer data for a report (requires token authentication)
 */
export async function getReportExplorer(
  reportId: string,
  token: string
): Promise<any> {
  try {
    return await apiFetch<any>(
      API_ENDPOINTS.BRAND_REPORTS.EXPLORER(reportId),
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get report explorer error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get report explorer data'
    );
  }
}

/**
 * Get visibility data for a report (requires token authentication)
 */
export async function getReportVisibility(
  reportId: string,
  token: string
): Promise<any> {
  try {
    return await apiFetch<any>(
      API_ENDPOINTS.BRAND_REPORTS.VISIBILITY(reportId),
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get report visibility error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get report visibility data'
    );
  }
}

/**
 * Get sentiment data for a report (requires token authentication)
 */
export async function getReportSentiment(
  reportId: string,
  token: string
): Promise<any> {
  try {
    return await apiFetch<any>(
      API_ENDPOINTS.BRAND_REPORTS.SENTIMENT(reportId),
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get report sentiment error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get report sentiment data'
    );
  }
}

/**
 * Get alignment data for a report (requires token authentication)
 */
export async function getReportAlignment(
  reportId: string,
  token: string
): Promise<AlignmentData> {
  try {
    return await apiFetch<AlignmentData>(
      API_ENDPOINTS.BRAND_REPORTS.ALIGNMENT(reportId),
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get report alignment error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get report alignment data'
    );
  }
}

/**
 * Get competition data for a report (requires token authentication)
 */
export async function getReportCompetition(
  reportId: string,
  token: string
): Promise<any> {
  try {
    return await apiFetch<any>(
      API_ENDPOINTS.BRAND_REPORTS.COMPETITION(reportId),
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get report competition error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get report competition data'
    );
  }
}

interface AggregatedReportQuery {
  startDate?: string;
  endDate?: string;
  models?: string[];
  includeVariation?: boolean;
  latestOnly?: boolean;
}

/**
 * Get aggregated visibility data for a project (requires token authentication)
 */
export async function getAggregatedVisibility(
  projectId: string,
  token: string,
  query?: AggregatedReportQuery
): Promise<any> {
  try {
    const params = new URLSearchParams();
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.models !== undefined) {
      // Send models parameter even if empty array (empty means all models)
      params.append('models', query.models.join(','));
    }
    if (query?.includeVariation !== undefined) params.append('includeVariation', String(query.includeVariation));
    if (query?.latestOnly !== undefined) params.append('latestOnly', String(query.latestOnly));

    const url = `${API_ENDPOINTS.BRAND_REPORTS.VISIBILITY_AGGREGATED(projectId)}${params.toString() ? `?${params.toString()}` : ''}`;
    
    return await apiFetch<any>(url, {
      method: 'GET',
      token,
    });
  } catch (error) {
    console.error('Get aggregated visibility error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get aggregated visibility data'
    );
  }
}

/**
 * Get aggregated alignment data for a project (requires token authentication)
 */
export async function getAggregatedAlignment(
  projectId: string,
  token: string,
  query?: AggregatedReportQuery
): Promise<any> {
  try {
    const params = new URLSearchParams();
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.models !== undefined) {
      // Send models parameter even if empty array (empty means all models)
      params.append('models', query.models.join(','));
    }
    if (query?.includeVariation !== undefined) params.append('includeVariation', String(query.includeVariation));
    if (query?.latestOnly !== undefined) params.append('latestOnly', String(query.latestOnly));

    const url = `${API_ENDPOINTS.BRAND_REPORTS.ALIGNMENT_AGGREGATED(projectId)}${params.toString() ? `?${params.toString()}` : ''}`;
    
    return await apiFetch<any>(url, {
      method: 'GET',
      token,
    });
  } catch (error) {
    console.error('Get aggregated alignment error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get aggregated alignment data'
    );
  }
}

/**
 * Get aggregated sentiment data for a project (requires token authentication)
 */
export async function getAggregatedSentiment(
  projectId: string,
  token: string,
  query?: AggregatedReportQuery
): Promise<any> {
  try {
    const params = new URLSearchParams();
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.models !== undefined) {
      // Send models parameter even if empty array (empty means all models)
      params.append('models', query.models.join(','));
    }
    if (query?.includeVariation !== undefined) params.append('includeVariation', String(query.includeVariation));
    if (query?.latestOnly !== undefined) params.append('latestOnly', String(query.latestOnly));

    const url = `${API_ENDPOINTS.BRAND_REPORTS.SENTIMENT_AGGREGATED(projectId)}${params.toString() ? `?${params.toString()}` : ''}`;
    
    return await apiFetch<any>(url, {
      method: 'GET',
      token,
    });
  } catch (error) {
    console.error('Get aggregated sentiment error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get aggregated sentiment data'
    );
  }
}

/**
 * Get aggregated explorer data for a project (requires token authentication)
 */
export async function getAggregatedExplorer(
  projectId: string,
  token: string,
  query?: AggregatedReportQuery
): Promise<any> {
  try {
    const params = new URLSearchParams();
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    // Explorer doesn't use models filter, but we can include it for consistency
    if (query?.includeVariation !== undefined) params.append('includeVariation', String(query.includeVariation));
    if (query?.latestOnly !== undefined) params.append('latestOnly', String(query.latestOnly));

    const url = `${API_ENDPOINTS.BRAND_REPORTS.EXPLORER_AGGREGATED(projectId)}${params.toString() ? `?${params.toString()}` : ''}`;
    
    return await apiFetch<any>(url, {
      method: 'GET',
      token,
    });
  } catch (error) {
    console.error('Get aggregated explorer error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get aggregated explorer data'
    );
  }
}

/**
 * Get aggregated competition data for a project (requires token authentication)
 */
export async function getAggregatedCompetition(
  projectId: string,
  token: string,
  query?: AggregatedReportQuery
): Promise<any> {
  try {
    const params = new URLSearchParams();
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.models !== undefined) {
      // Send models parameter even if empty array (empty means all models)
      params.append('models', query.models.join(','));
    }
    if (query?.includeVariation !== undefined) params.append('includeVariation', String(query.includeVariation));
    if (query?.latestOnly !== undefined) params.append('latestOnly', String(query.latestOnly));

    const url = `${API_ENDPOINTS.BRAND_REPORTS.COMPETITION_AGGREGATED(projectId)}${params.toString() ? `?${params.toString()}` : ''}`;
    
    return await apiFetch<any>(url, {
      method: 'GET',
      token,
    });
  } catch (error) {
    console.error('Get aggregated competition error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get aggregated competition data'
    );
  }
}