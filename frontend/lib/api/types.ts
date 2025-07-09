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
  favicon?: string;
  url: string;
  industry: string;
  market: string;
  language?: string;
  shortDescription: string;
  fullDescription: string;
  longDescription: string;
  objectives?: string;
  keyBrandAttributes: string[];
  scrapedKeywords?: string[];
  competitors: string[];
  competitorDetails?: Array<{
    name: string;
    website?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userEmail: string;
  userLanguage?: string;
  nextManualAnalysisAllowedAt?: string;
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
  additionalInstructions?: string;
  prompts?: {
    visibility?: string[];
    sentiment?: string[];
    alignment?: string[];
    competition?: string[];
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
  scrapedKeywords?: string[];
  shortDescription?: string;
  fullDescription?: string;
  additionalInstructions?: string;
}

export interface GeneratePromptsResponse {
  visibility: string[];
  sentiment: string[];
  alignment: string[];
  competition: string[];
}

export interface PromptSet {
  id: string;
  projectId: string;
  visibility: string[];
  sentiment: string[];
  alignment: string[];
  competition: string[];
  updatedAt: string;
  createdAt: string;
}

export interface GeneratePromptsFromKeywordsRequest {
  projectId: string;
  keywords: string[];
  additionalInstructions?: string;
  promptType: 'visibility' | 'sentiment' | 'alignment' | 'competition';
  count?: number;
}

export interface GeneratePromptsFromKeywordsResponse {
  prompts: string[];
  type: string;
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

// Alignment data types
export interface AlignmentSummary {
  overallAlignmentScore: number;
  averageAttributeScores: Record<string, number>;
  attributeAlignmentSummary: Array<{
    attribute: string;
    score: number;
  }>;
}

export interface AlignmentData {
  summary: AlignmentSummary;
  // Add other alignment fields if needed
}