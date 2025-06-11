/**
 * Brand Report API
 */

import { API_ENDPOINTS } from './constants';
import { apiFetch } from './utils';
import { BatchResult, CitationsData, SpontaneousData } from './types';
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
): Promise<any> {
  try {
    return await apiFetch<any>(
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