/**
 * API Types and Interfaces
 */

// User types
export interface CreateUserRequest {
  email: string;
  language?: string;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  language: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  projectIds: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  projectIds: string[];
}

export interface UpdatePhoneRequest {
  phoneNumber: string;
}

export interface UpdatePhoneResponse {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
  };
  createdAt: string;
  updatedAt: string;
  projectIds?: string[];
}

export interface UpdateEmailRequest {
  email: string;
}

export interface UpdateEmailResponse {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
  };
  createdAt: string;
  updatedAt: string;
  projectIds?: string[];
}

// Token types
export interface GenerateTokenRequest {
  userId: string;
}

export interface GenerateTokenResponse {
  success: boolean;
  message: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  userId?: string;
}

// Magic link types
export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkResponse {
  success: boolean;
  message: string;
  userId: string;
}

// Project types
export interface CreateProjectRequest {
  url: string;
  market: string;
  language?: string;
}

export interface ProjectResponse {
  id: string;
  name?: string;
  brandName: string;
  website: string;
  url: string;
  industry: string;
  market: string;
  language?: string;
  shortDescription: string;
  fullDescription: string;
  longDescription: string;
  objectives?: string;
  keyBrandAttributes: string[];
  competitors: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  userEmail: string;
  userLanguage?: string;
}

export interface CreateFullProjectRequest {
  url: string;
  brandName: string;
  description?: string;
  industry?: string;
  market: string;
  language?: string;
  keyBrandAttributes?: string[];
  competitors?: string[];
  prompts?: {
    spontaneous?: string[];
    direct?: string[];
    comparison?: string[];
    accuracy?: string[];
    brandBattle?: string[];
  };
}

export interface CreateProjectFromUrlRequest {
  url: string;
  market: string;
  language?: string;
  name: string;
}

export interface UrlUsageResponse {
  currentUrls: string[];
  currentCount: number;
  maxUrls: number;
  canAddMore: boolean;
}

// Prompt types
export interface GeneratePromptsRequest {
  brandName: string;
  website: string;
  industry: string;
  market: string;
  language?: string;
  keyBrandAttributes: string[];
  competitors: string[];
  shortDescription?: string;
  fullDescription?: string;
}

export interface GeneratePromptsResponse {
  spontaneous: string[];
  direct: string[];
  comparison: string[];
  accuracy: string[];
  brandBattle: string[];
}

export interface PromptSet {
  id: string;
  projectId: string;
  spontaneous: string[];
  direct: string[];
  comparison: string[];
  accuracy: string[];
  brandBattle: string[];
  updatedAt: string;
  createdAt: string;
}

// Batch result types
export interface BatchResult {
  id: string;
  batchExecutionId: string;
  pipelineType: string;
  result: any;
  createdAt: string;
}

// Citation types
interface WebSearchQuery {
  query: string;
  status: string;
  timestamp: string;
  provider: string;
}

export interface CitationsData {
  webAccess: {
    totalResponses: number;
    responsesWithWebAccess: number;
    percentage: number;
  };
  topSources: Array<{
    domain: string;
    count: number;
    percentage?: number;
  }>;
  topKeywords?: Array<{
    keyword: string;
    count: number;
    percentage?: number;
  }>;
  citations: Array<{
    website: string;
    webSearchQueries: WebSearchQuery[];
    link: string;
    model?: string;
    promptIndex: number;
    promptType: string;
    fullCitation?: Record<string, unknown>;
  }>;
  totalCitations?: number;
}

// Spontaneous data types
export interface SpontaneousData {
  summary: {
    mentionRate: number;
    topMentions: string[];
    topMentionCounts?: {
      mention: string;
      count: number;
    }[];
  };
  results: any[];
  webSearchSummary?: {
    webSearchCount: number;
    consultedWebsites: string[];
    consultedWebsiteCounts?: {
      domain: string;
      count: number;
    }[];
  };
}