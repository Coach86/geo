/**
 * Utility functions for managing report selection across pages
 */

const SELECTED_REPORT_KEY = 'selectedReportId';
const SELECTED_PROJECT_REPORT_PREFIX = 'selectedReportId_';

/**
 * Get the storage key for a specific project's selected report
 */
function getProjectReportKey(projectId: string): string {
  return `${SELECTED_PROJECT_REPORT_PREFIX}${projectId}`;
}

/**
 * Save the selected report ID for a specific project
 */
export function saveSelectedReportId(projectId: string, reportId: string): void {
  if (!projectId || !reportId) return;
  
  const key = getProjectReportKey(projectId);
  localStorage.setItem(key, reportId);
  
  // Also dispatch a custom event so other components can react
  window.dispatchEvent(new CustomEvent('reportSelectionChanged', {
    detail: { projectId, reportId }
  }));
}

/**
 * Get the selected report ID for a specific project
 */
export function getSelectedReportId(projectId: string): string | null {
  if (!projectId) return null;
  
  const key = getProjectReportKey(projectId);
  return localStorage.getItem(key);
}

/**
 * Clear the selected report ID for a specific project
 */
export function clearSelectedReportId(projectId: string): void {
  if (!projectId) return;
  
  const key = getProjectReportKey(projectId);
  localStorage.removeItem(key);
}

/**
 * Clear all selected report IDs (useful when logging out or logging in)
 */
export function clearAllSelectedReportIds(): void {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(SELECTED_PROJECT_REPORT_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Hook to listen for report selection changes
 */
export function useReportSelectionListener(callback: (projectId: string, reportId: string) => void): (() => void) | void {
  if (typeof window === 'undefined') return;
  
  const handleChange = (event: CustomEvent) => {
    const { projectId, reportId } = event.detail;
    callback(projectId, reportId);
  };
  
  window.addEventListener('reportSelectionChanged', handleChange as EventListener);
  
  const cleanup = () => {
    window.removeEventListener('reportSelectionChanged', handleChange as EventListener);
  };
  
  return cleanup;
}