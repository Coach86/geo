/**
 * API Constants
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    MAGIC_LINK: "/auth/magic-link",
  },
  
  // Token endpoints
  TOKENS: {
    GENERATE: "/tokens/generate",
    VALIDATE: "/tokens/validate",
  },
  
  // User endpoints
  USER: {
    BASE: "/user",
    BY_EMAIL: (email: string) => `/user/email/${encodeURIComponent(email)}`,
    PROFILE: "/user/profile",
    PROFILE_PHONE: "/user/profile/phone",
    PROFILE_EMAIL: "/user/profile/email",
  },
  
  // Project endpoints
  PROJECT: {
    LIST: "/user/project",
    BY_ID: (id: string) => `/user/project/${id}`,
    ANALYZE_URL: "/user/project/analyze-from-url",
    CREATE: "/user/project/create",
    CREATE_FROM_URL: "/user/project/create-from-url",
    URL_USAGE: "/user/project/url-usage",
  },
  
  // Prompt endpoints
  PROMPTS: {
    GENERATE: "/prompts/generate",
    BY_PROJECT: (projectId: string) => `/prompts/${projectId}`,
  },
  
  // Brand Report endpoints
  BRAND_REPORTS: {
    BY_PROJECT: (projectId: string) => `/brand-reports/project/${projectId}`,
    BY_ID: (reportId: string) => `/brand-reports/${reportId}`,
    EXPLORER: (reportId: string) => `/brand-reports/${reportId}/explorer`,
    VISIBILITY: (reportId: string) => `/brand-reports/${reportId}/visibility`,
    SENTIMENT: (reportId: string) => `/brand-reports/${reportId}/sentiment`,
    ALIGNMENT: (reportId: string) => `/brand-reports/${reportId}/alignment`,
    COMPETITION: (reportId: string) => `/brand-reports/${reportId}/competition`,
  },
  
  // Batch result endpoints
  BATCH_RESULTS: {
    BY_REPORT: (reportId: string) => `/batch-results/report/${reportId}`,
  },
  
  // Organization endpoints
  ORGANIZATION: {
    MY_ORGANIZATION: '/user/organization',
    USERS: '/user/organization/users',
    USER_BY_ID: (userId: string) => `/user/organization/users/${userId}`,
    MODELS: '/user/organization/models',
  },
  
  // Config endpoints
  CONFIG: {
    MODELS: '/config/models',
  },
} as const;