/**
 * Authentication API utilities for frontend
 */
import { ReportResponse } from "../types/reports";

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
  projectIds: string[];
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

export interface CreateProjectRequest {
  url: string;
  market: string;
  language?: string;
}

export interface ProjectResponse {
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
  request: CreateProjectRequest,
  token: string
): Promise<ProjectResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/user/project/analyze-from-url`,
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

export interface CreateFullProjectRequest {
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
 * Create and save project (requires token authentication)
 */
export async function createProject(
  request: CreateFullProjectRequest,
  token: string
): Promise<ProjectResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/project/create`, {
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
        .catch(() => ({ message: "Failed to create project" }));
      throw new Error(error.message || "Failed to create project");
    }

    return response.json();
  } catch (error) {
    console.error("Project creation error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to create project"
    );
  }
}

export interface CreateProjectFromUrlRequest {
  url: string;
  market: string;
  language?: string;
}

/**
 * Create project from URL (requires token authentication)
 */
export async function createProjectFromUrl(
  request: CreateProjectFromUrlRequest,
  token: string
): Promise<ProjectResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/user/project/create-from-url`,
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
      const errorData = await response
        .json()
        .catch(() => ({ message: "Failed to create project" }));

      // Pass through the full error object for plan limit errors
      if (errorData.code === "PROJECT_LIMIT_EXCEEDED") {
        const error = new Error(errorData.message);
        (error as any).response = { data: errorData };
        throw error;
      }

      throw new Error(errorData.message || "Failed to create project");
    }

    return response.json();
  } catch (error) {
    console.error("Project creation error:", error);
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
    maxProjects: number;
    maxAIModels: number;
  };
  selectedModels: string[];
  createdAt: string;
  updatedAt: string;
  projectIds: string[];
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
 * Get user's projects (requires token authentication)
 */
export async function getUserProjects(
  token: string
): Promise<ProjectResponse[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/project`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to get projects" }));
      throw new Error(error.message || "Failed to get projects");
    }

    return response.json();
  } catch (error) {
    console.error("Get projects error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get projects"
    );
  }
}

export interface UrlUsageResponse {
  currentUrls: string[];
  currentCount: number;
  maxUrls: number;
  canAddMore: boolean;
}

/**
 * Get user's URL usage information (requires token authentication)
 */
export async function getUserUrlUsage(
  token: string
): Promise<UrlUsageResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/project/url-usage`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to get URL usage" }));
      throw new Error(error.message || "Failed to get URL usage");
    }

    return response.json();
  } catch (error) {
    console.error("Get URL usage error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get URL usage"
    );
  }
}

/**
 * Get project details by ID (requires token authentication)
 */
export async function getProjectById(
  projectId: string,
  token: string
): Promise<ProjectResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/project/${projectId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to get project details" }));
      throw new Error(error.message || "Failed to get project details");
    }

    return response.json();
  } catch (error) {
    console.error("Get project details error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get project details"
    );
  }
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
  projectId: string,
  token: string
): Promise<PromptSet> {
  try {
    const response = await fetch(`${API_BASE_URL}/prompts/${projectId}`, {
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
 * Update project attributes and competitors (requires token authentication)
 */
export async function updateProject(
  projectId: string,
  data: { keyBrandAttributes?: string[]; competitors?: string[] },
  token: string
): Promise<ProjectResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/project/${projectId}`, {
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
        .catch(() => ({ message: "Failed to update project" }));
      throw new Error(error.message || "Failed to update project");
    }

    return response.json();
  } catch (error) {
    console.error("Update project error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update project"
    );
  }
}

/**
 * Update prompt set for a company (requires token authentication)
 */
export async function updatePromptSet(
  projectId: string,
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
    const response = await fetch(`${API_BASE_URL}/prompts/${projectId}`, {
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
 * Get all reports for a project (requires token authentication)
 */
export async function getProjectReports(
  projectId: string,
  token: string
): Promise<ReportResponse[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/reports/project/${projectId}`,
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
        .catch(() => ({ message: "Failed to get project reports" }));
      throw new Error(error.message || "Failed to get project reports");
    }

    return response.json();
  } catch (error) {
    console.error("Get project reports error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get project reports"
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
