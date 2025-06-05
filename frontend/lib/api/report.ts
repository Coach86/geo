/**
 * Report API
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
      API_ENDPOINTS.REPORTS.BY_PROJECT(projectId),
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
 * Get citations data for a report (requires token authentication)
 */
export async function getReportCitations(
  reportId: string,
  token: string
): Promise<CitationsData> {
  try {
    return await apiFetch<CitationsData>(
      API_ENDPOINTS.REPORTS.CITATIONS(reportId),
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get report citations error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get report citations'
    );
  }
}

/**
 * Get spontaneous data for a report (requires token authentication)
 */
export async function getReportSpontaneous(
  reportId: string,
  token: string
): Promise<SpontaneousData> {
  try {
    return await apiFetch<SpontaneousData>(
      API_ENDPOINTS.REPORTS.SPONTANEOUS(reportId),
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get report spontaneous error:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to get report spontaneous data'
    );
  }
}