/**
 * Utility functions for persisting navigation state
 */

const STORAGE_KEYS = {
  SELECTED_DOMAIN: 'geo_selected_domain',
  SELECTED_PROJECT: 'geo_selected_project',
  SELECTED_REPORT_PREFIX: 'geo_selected_report_', // Append projectId
} as const;

/**
 * Domain persistence
 */
export function saveSelectedDomain(domain: string | null) {
  if (domain) {
    localStorage.setItem(STORAGE_KEYS.SELECTED_DOMAIN, domain);
  } else {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_DOMAIN);
  }
}

export function getSelectedDomain(): string | null {
  return localStorage.getItem(STORAGE_KEYS.SELECTED_DOMAIN);
}

/**
 * Project persistence
 */
export function saveSelectedProject(projectId: string | null) {
  if (projectId) {
    localStorage.setItem(STORAGE_KEYS.SELECTED_PROJECT, projectId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_PROJECT);
  }
}

export function getSelectedProject(): string | null {
  return localStorage.getItem(STORAGE_KEYS.SELECTED_PROJECT);
}

/**
 * Report persistence (per project)
 */
export function saveSelectedReport(projectId: string, reportId: string | null) {
  const key = `${STORAGE_KEYS.SELECTED_REPORT_PREFIX}${projectId}`;
  if (reportId) {
    localStorage.setItem(key, reportId);
  } else {
    localStorage.removeItem(key);
  }
}

export function getSelectedReport(projectId: string): string | null {
  const key = `${STORAGE_KEYS.SELECTED_REPORT_PREFIX}${projectId}`;
  return localStorage.getItem(key);
}

/**
 * Clear all navigation persistence
 */
export function clearNavigationPersistence() {
  localStorage.removeItem(STORAGE_KEYS.SELECTED_DOMAIN);
  localStorage.removeItem(STORAGE_KEYS.SELECTED_PROJECT);
  
  // Clear all report selections
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(STORAGE_KEYS.SELECTED_REPORT_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}