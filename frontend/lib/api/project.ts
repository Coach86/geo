/**
 * Project API
 */

import { API_ENDPOINTS } from './constants';
import { apiFetch } from './utils';
import {
  CreateProjectRequest,
  ProjectResponse,
  CreateFullProjectRequest,
  CreateProjectFromUrlRequest,
  UrlUsageResponse,
  GeneratePromptsRequest,
  GeneratePromptsResponse,
  PromptSet,
  GeneratePromptsFromKeywordsRequest,
  GeneratePromptsFromKeywordsResponse,
} from './types';

/**
 * Analyze website from URL without saving (requires token authentication)
 */
export async function analyzeWebsite(
  request: CreateProjectRequest,
  token: string
): Promise<ProjectResponse> {
  try {
    return await apiFetch<ProjectResponse>(API_ENDPOINTS.PROJECT.ANALYZE_URL, {
      method: 'POST',
      body: JSON.stringify(request),
      token,
    });
  } catch (error) {
    console.error('Website analysis error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to analyze website'
    );
  }
}

/**
 * Create and save project (requires token authentication)
 */
export async function createProject(
  request: CreateFullProjectRequest,
  token: string
): Promise<ProjectResponse> {
  try {
    return await apiFetch<ProjectResponse>(API_ENDPOINTS.PROJECT.CREATE, {
      method: 'POST',
      body: JSON.stringify(request),
      token,
    });
  } catch (error) {
    console.error('Project creation error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create project'
    );
  }
}

/**
 * Create project from URL (requires token authentication)
 */
export async function createProjectFromUrl(
  request: CreateProjectFromUrlRequest,
  token: string
): Promise<ProjectResponse> {
  try {
    return await apiFetch<ProjectResponse>(
      API_ENDPOINTS.PROJECT.CREATE_FROM_URL,
      {
        method: 'POST',
        body: JSON.stringify(request),
        token,
      }
    );
  } catch (error: any) {
    console.error('Project creation error:', error);
    
    // Pass through the full error object for plan limit errors
    if (error.response?.data?.code === 'PROJECT_LIMIT_EXCEEDED') {
      throw error;
    }
    
    throw error;
  }
}

/**
 * Get user's projects (requires token authentication)
 */
export async function getUserProjects(
  token: string
): Promise<ProjectResponse[]> {
  try {
    return await apiFetch<ProjectResponse[]>(API_ENDPOINTS.PROJECT.LIST, {
      method: 'GET',
      token,
    });
  } catch (error) {
    console.error('Get projects error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get projects'
    );
  }
}

/**
 * Get user's URL usage information (requires token authentication)
 */
export async function getUserUrlUsage(
  token: string
): Promise<UrlUsageResponse> {
  try {
    return await apiFetch<UrlUsageResponse>(API_ENDPOINTS.PROJECT.URL_USAGE, {
      method: 'GET',
      token,
    });
  } catch (error) {
    console.error('Get URL usage error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get URL usage'
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
    return await apiFetch<ProjectResponse>(
      API_ENDPOINTS.PROJECT.BY_ID(projectId),
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get project details error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get project details'
    );
  }
}

/**
 * Update project attributes and competitors (requires token authentication)
 */
export async function updateProject(
  projectId: string,
  data: { name?: string; keyBrandAttributes?: string[]; competitors?: string[]; objectives?: string },
  token: string
): Promise<ProjectResponse> {
  try {
    return await apiFetch<ProjectResponse>(
      API_ENDPOINTS.PROJECT.BY_ID(projectId),
      {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
      }
    );
  } catch (error) {
    console.error('Update project error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to update project'
    );
  }
}

/**
 * Generate prompts for brand analysis (requires token authentication)
 */
export async function generatePrompts(
  request: GeneratePromptsRequest,
  token: string
): Promise<GeneratePromptsResponse> {
  try {
    return await apiFetch<GeneratePromptsResponse>(
      API_ENDPOINTS.PROMPTS.GENERATE,
      {
        method: 'POST',
        body: JSON.stringify(request),
        token,
      }
    );
  } catch (error) {
    console.error('Prompt generation error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to generate prompts'
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
    return await apiFetch<PromptSet>(
      API_ENDPOINTS.PROMPTS.BY_PROJECT(projectId),
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get prompt set error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get prompt set'
    );
  }
}

/**
 * Update prompt set for a company (requires token authentication)
 */
export async function updatePromptSet(
  projectId: string,
  data: {
    visibility?: string[];
    sentiment?: string[];
    alignment?: string[];
    competition?: string[];
  },
  token: string
): Promise<PromptSet> {
  try {
    return await apiFetch<PromptSet>(
      API_ENDPOINTS.PROMPTS.UPDATE(projectId),
      {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
      }
    );
  } catch (error) {
    console.error('Update prompt set error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to update prompt set'
    );
  }
}

/**
 * Regenerate specific prompt type for a project (requires token authentication)
 */
export async function regeneratePromptType(
  projectId: string,
  promptType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
  token: string,
  count?: number,
  additionalInstructions?: string,
  keywords?: string[],
  addMode?: boolean
): Promise<{ prompts: string[]; type: string }> {
  try {
    return await apiFetch<{ prompts: string[]; type: string }>(
      API_ENDPOINTS.PROMPTS.REGENERATE_TYPE(projectId, promptType),
      {
        method: 'POST',
        body: JSON.stringify({ count, additionalInstructions, keywords, addMode }),
        token,
      }
    );
  } catch (error) {
    console.error('Regenerate prompt type error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to regenerate prompts'
    );
  }
}

/**
 * Generate prompts from keywords (requires token authentication)
 */
export async function generatePromptsFromKeywords(
  request: GeneratePromptsFromKeywordsRequest,
  token: string
): Promise<GeneratePromptsFromKeywordsResponse> {
  try {
    return await apiFetch<GeneratePromptsFromKeywordsResponse>(
      API_ENDPOINTS.PROMPTS.GENERATE_FROM_KEYWORDS,
      {
        method: 'POST',
        body: JSON.stringify(request),
        token,
      }
    );
  } catch (error) {
    console.error('Generate prompts from keywords error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to generate prompts from keywords'
    );
  }
}

/**
 * Run manual analysis for a project (rate limited, requires token authentication)
 */
export async function runManualAnalysis(
  projectId: string,
  token: string
): Promise<{
  success: boolean;
  message: string;
  batchExecutionId: string;
  estimatedDuration: string;
}> {
  try {
    return await apiFetch<{
      success: boolean;
      message: string;
      batchExecutionId: string;
      estimatedDuration: string;
    }>(
      `/projects/${projectId}/run-analysis`,
      {
        method: 'POST',
        token,
      }
    );
  } catch (error) {
    console.error('Run manual analysis error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to run analysis'
    );
  }
}