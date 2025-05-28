/**
 * Authentication API utilities for frontend
 */
import { ReportResponse } from '../types/reports';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface CreateUserRequest {
  email: string;
  language?: string;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  companyIds: string[];
}

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

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkResponse {
  success: boolean;
  message: string;
  userId: string;
}

export interface CreateIdentityCardRequest {
  url: string;
  market: string;
  language?: string;
}

export interface IdentityCardResponse {
  id: string;
  brandName: string;
  website: string;
  url: string;
  industry: string;
  market: string;
  language?: string;
  shortDescription: string;
  fullDescription: string;
  longDescription: string;
  keyBrandAttributes: string[];
  competitors: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  userEmail: string;
  userLanguage?: string;
}

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  language = "en"
): Promise<CreateUserResponse> {
  const response = await fetch(`${API_BASE_URL}/user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, language }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to create user" }));
    throw new Error(error.message || "Failed to create user");
  }

  return response.json();
}

/**
 * Find user by email
 */
export async function findUserByEmail(
  email: string
): Promise<CreateUserResponse | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/user/email/${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 404) {
      return null; // User not found
    }

    if (!response.ok) {
      throw new Error("Failed to find user");
    }

    return response.json();
  } catch (error) {
    console.error("Error finding user by email:", error);
    return null;
  }
}

/**
 * Generate a token for a user and send magic link email
 */
export async function generateTokenAndSendEmail(
  userId: string
): Promise<GenerateTokenResponse> {
  const response = await fetch(`${API_BASE_URL}/tokens/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to generate token" }));
    throw new Error(error.message || "Failed to generate token");
  }

  return response.json();
}

/**
 * Validate a token
 */
export async function validateToken(
  token: string
): Promise<ValidateTokenResponse> {
  const response = await fetch(
    `${API_BASE_URL}/tokens/validate?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to validate token" }));
    throw new Error(error.message || "Failed to validate token");
  }

  return response.json();
}

/**
 * Send magic link using the new dedicated auth endpoint
 */
export async function sendMagicLink(email: string): Promise<MagicLinkResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to send magic link" }));
      throw new Error(error.message || "Failed to send magic link");
    }

    return response.json();
  } catch (error) {
    console.error("Magic link error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to send magic link"
    );
  }
}

/**
 * Analyze website from URL without saving (requires token authentication)
 */
export async function analyzeWebsite(
  request: CreateIdentityCardRequest,
  token: string
): Promise<IdentityCardResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/user/identity-card/analyze-from-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to analyze website" }));
      throw new Error(error.message || "Failed to analyze website");
    }

    return response.json();
  } catch (error) {
    console.error("Website analysis error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to analyze website"
    );
  }
}

export interface CreateFullIdentityCardRequest {
  url: string;
  brandName: string;
  description?: string;
  industry?: string;
  market: string;
  language?: string;
  keyBrandAttributes?: string[];
  competitors?: string[];
}

/**
 * Create and save identity card (requires token authentication)
 */
export async function createIdentityCard(
  request: CreateFullIdentityCardRequest,
  token: string
): Promise<IdentityCardResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/identity-card/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to create identity card" }));
      throw new Error(error.message || "Failed to create identity card");
    }

    return response.json();
  } catch (error) {
    console.error("Identity card creation error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to create identity card"
    );
  }
}

export interface CreateCompanyFromUrlRequest {
  url: string;
  market: string;
  language?: string;
}

/**
 * Create identity card from URL (requires token authentication)
 */
export async function createCompanyFromUrl(
  request: CreateCompanyFromUrlRequest,
  token: string
): Promise<IdentityCardResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/identity-card/create-from-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to create company" }));
      
      // Pass through the full error object for plan limit errors
      if (errorData.code === "BRAND_LIMIT_EXCEEDED") {
        const error = new Error(errorData.message);
        (error as any).response = { data: errorData };
        throw error;
      }
      
      throw new Error(errorData.message || "Failed to create company");
    }

    return response.json();
  } catch (error) {
    console.error("Company creation error:", error);
    throw error;
  }
}

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

/**
 * Generate prompts for brand analysis (requires token authentication)
 */
export async function generatePrompts(
  request: GeneratePromptsRequest,
  token: string
): Promise<GeneratePromptsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/prompts/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to generate prompts" }));
      throw new Error(error.message || "Failed to generate prompts");
    }

    return response.json();
  } catch (error) {
    console.error("Prompt generation error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to generate prompts"
    );
  }
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
    maxBrands: number;
    maxAIModels: number;
  };
  createdAt: string;
  updatedAt: string;
  companyIds?: string[];
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
    maxBrands: number;
    maxAIModels: number;
  };
  createdAt: string;
  updatedAt: string;
  companyIds?: string[];
}

/**
 * Update user phone number (requires token authentication)
 */
export async function updatePhoneNumber(
  request: UpdatePhoneRequest,
  token: string
): Promise<UpdatePhoneResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/profile/phone`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to update phone number" }));
      throw new Error(error.message || "Failed to update phone number");
    }

    return response.json();
  } catch (error) {
    console.error("Phone number update error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update phone number"
    );
  }
}

/**
 * Update user email (requires token authentication)
 */
export async function updateEmail(
  request: UpdateEmailRequest,
  token: string
): Promise<UpdateEmailResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/profile/email`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to update email" }));
      throw new Error(error.message || "Failed to update email");
    }

    return response.json();
  } catch (error) {
    console.error("Email update error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update email"
    );
  }
}

export interface UserProfile {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  planSettings: {
    maxBrands: number;
    maxAIModels: number;
  };
  createdAt: string;
  updatedAt: string;
  companyIds: string[];
}

/**
 * Get user profile (requires token authentication)
 */
export async function getUserProfile(token: string): Promise<UserProfile> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to get user profile" }));
      throw new Error(error.message || "Failed to get user profile");
    }

    return response.json();
  } catch (error) {
    console.error("Get user profile error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get user profile"
    );
  }
}

/**
 * Get user's identity cards (requires token authentication)
 */
export async function getUserIdentityCards(
  token: string
): Promise<IdentityCardResponse[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/identity-card`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to get identity cards" }));
      throw new Error(error.message || "Failed to get identity cards");
    }

    return response.json();
  } catch (error) {
    console.error("Get identity cards error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get identity cards"
    );
  }
}

/**
 * Get company details by ID (requires token authentication)
 */
export async function getCompanyById(
  companyId: string,
  token: string
): Promise<IdentityCardResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/user/identity-card/${companyId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to get company details" }));
      throw new Error(error.message || "Failed to get company details");
    }

    return response.json();
  } catch (error) {
    console.error("Get company details error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get company details"
    );
  }
}

export interface PromptSet {
  id: string;
  companyId: string;
  spontaneous: string[];
  direct: string[];
  comparison: string[];
  accuracy: string[];
  brandBattle: string[];
  updatedAt: string;
  createdAt: string;
}

export interface BatchResult {
  id: string;
  batchExecutionId: string;
  pipelineType: string;
  result: any;
  createdAt: string;
}

/**
 * Get batch results for a report (requires token authentication)
 */
export async function getBatchResults(
  reportId: string,
  token: string
): Promise<BatchResult[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/batch-results/report/${reportId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to get batch results" }));
      throw new Error(error.message || "Failed to get batch results");
    }

    return response.json();
  } catch (error) {
    console.error("Get batch results error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get batch results"
    );
  }
}

/**
 * Get prompt set for a company (requires token authentication)
 */
export async function getPromptSet(
  companyId: string,
  token: string
): Promise<PromptSet> {
  try {
    const response = await fetch(`${API_BASE_URL}/prompts/${companyId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to get prompt set" }));
      throw new Error(error.message || "Failed to get prompt set");
    }

    return response.json();
  } catch (error) {
    console.error("Get prompt set error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get prompt set"
    );
  }
}

/**
 * Update identity card attributes and competitors (requires token authentication)
 */
export async function updateIdentityCard(
  companyId: string,
  data: { keyBrandAttributes?: string[]; competitors?: string[] },
  token: string
): Promise<IdentityCardResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/user/identity-card/${companyId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to update identity card" }));
      throw new Error(error.message || "Failed to update identity card");
    }

    return response.json();
  } catch (error) {
    console.error("Update identity card error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update identity card"
    );
  }
}

/**
 * Update prompt set for a company (requires token authentication)
 */
export async function updatePromptSet(
  companyId: string,
  data: {
    spontaneous?: string[];
    direct?: string[];
    comparison?: string[];
    accuracy?: string[];
    brandBattle?: string[];
  },
  token: string
): Promise<PromptSet> {
  try {
    const response = await fetch(`${API_BASE_URL}/prompts/${companyId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to update prompt set" }));
      throw new Error(error.message || "Failed to update prompt set");
    }

    return response.json();
  } catch (error) {
    console.error("Update prompt set error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update prompt set"
    );
  }
}


/**
 * Get all reports for a company (requires token authentication)
 */
export async function getCompanyReports(
  companyId: string,
  token: string
): Promise<ReportResponse[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/reports/company/${companyId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to get company reports" }));
      throw new Error(error.message || "Failed to get company reports");
    }

    return response.json();
  } catch (error) {
    console.error("Get company reports error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get company reports"
    );
  }
}

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
  }>;
  citations: Array<{
    website: string;
    webSearchQueries: WebSearchQuery[];
    link: string;
    fullCitation: Record<string, unknown>;
  }>;
}

/**
 * Get citations data for a report (requires token authentication)
 */
export async function getReportCitations(
  reportId: string,
  token: string
): Promise<CitationsData> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/reports/citations/${reportId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to get report citations" }));
      throw new Error(error.message || "Failed to get report citations");
    }

    return response.json();
  } catch (error) {
    console.error("Get report citations error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get report citations"
    );
  }
}

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

/**
 * Get spontaneous data for a report (requires token authentication)
 */
export async function getReportSpontaneous(
  reportId: string,
  token: string
): Promise<SpontaneousData> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/reports/spontaneous/${reportId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to get report spontaneous data" }));
      throw new Error(error.message || "Failed to get report spontaneous data");
    }

    return response.json();
  } catch (error) {
    console.error("Get report spontaneous error:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to get report spontaneous data"
    );
  }
}
