import axios from 'axios';
import authApi from './auth';
import {
  Project,
  PromptSet,
  SpontaneousResults,
  SentimentResults,
  ComparisonResults,
  User,
  BatchExecution,
  AIModel,
} from './types';

const API_BASE = '/api/admin';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Project API
export const getProjects = async (): Promise<Project[]> => {
  const response = await authApi.get('/project');
  return response.data;
};

export const getProjectById = async (id: string): Promise<Project> => {
  const response = await authApi.get(`/project/${id}`);
  return response.data;
};

export const createProjectFromUrl = async (
  url: string,
  organizationId: string,
  market?: string,
  language?: string,
): Promise<Project> => {
  const response = await authApi.post('/project/from-url', { url, organizationId, market, language });
  return response.data;
};

export const updateProjectDetails = async (
  id: string,
  data: {
    keyBrandAttributes?: string[];
    competitors?: string[];
  },
): Promise<Project> => {
  const response = await authApi.patch(`/project/${id}`, data);
  return response.data;
};

export const deleteProject = async (id: string): Promise<void> => {
  await authApi.delete(`/project/${id}`);
};

// User API
export const getUsers = async (): Promise<User[]> => {
  const response = await authApi.get('/users');
  return response.data;
};

export const getUserById = async (id: string): Promise<User> => {
  const response = await authApi.get(`/users/${id}`);
  return response.data;
};

export const getUserByEmail = async (email: string): Promise<User> => {
  const response = await authApi.get(`/users?email=${encodeURIComponent(email)}`);
  return response.data;
};

export const createUser = async (data: { email: string; language: string }): Promise<User> => {
  const response = await authApi.post('/users', data);
  return response.data;
};

export const updateUser = async (
  id: string,
  data: {
    email?: string;
    language?: string;
    phoneNumber?: string;
    organizationId?: string;
    stripePlanId?: string;
  },
): Promise<User> => {
  const response = await authApi.patch(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: string): Promise<User> => {
  const response = await authApi.delete(`/users/${id}`);
  return response.data;
};

export const updateUserPlanSettings = async (
  id: string,
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
    maxSpontaneousPrompts?: number;
    maxUrls: number;
    maxCompetitors: number;
  },
): Promise<User> => {
  const response = await authApi.patch(`/users/${id}/plan-settings`, planSettings);
  return response.data;
};

// AI Models API for admin
export const getAvailableModels = async (
  userId: string,
): Promise<{ models: AIModel[]; maxSelectable: number }> => {
  const response = await authApi.get(`/users/${userId}/available-models`);
  return response.data;
};

export const updateUserSelectedModels = async (
  id: string,
  selectedModels: string[],
): Promise<User> => {
  const response = await authApi.patch(`/users/${id}/selected-models`, { selectedModels });
  return response.data;
};

// Config API
export const getConfig = async () => {
  const response = await authApi.get('/config');
  return response.data;
};

// Prompt Set API
export const getPromptSet = async (projectId: string): Promise<PromptSet | null> => {
  try {
    const response = await authApi.get(`/prompt-set/${projectId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const updatePromptSet = async (
  projectId: string,
  data: {
    spontaneous?: string[];
    direct?: string[];
    comparison?: string[];
    accuracy?: string[];
    brandBattle?: string[];
  },
): Promise<PromptSet> => {
  const response = await authApi.patch(`/prompt-set/${projectId}`, data);
  return response.data;
};

export const regeneratePromptSet = async (projectId: string): Promise<PromptSet> => {
  const response = await authApi.post(`/prompt-set/${projectId}/regenerate`);
  return response.data;
};

export const waitForPromptSet = async (
  projectId: string,
  timeout = 30000,
  interval = 2000,
): Promise<PromptSet | null> => {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const promptSet = await getPromptSet(projectId);
      if (promptSet) {
        return promptSet;
      }
    } catch (error) {
      // Not ready yet, continue polling
    }

    // Wait for the next interval
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  // Timeout reached
  return null;
};

// Batch Pipeline API
export const runSpontaneousPipeline = async (
  projectId: string,
): Promise<SpontaneousResults & { batchExecutionId: string }> => {
  const response = await authApi.post(`/batch/pipeline/spontaneous/${projectId}`);
  return response.data;
};

export const runSentimentPipeline = async (
  projectId: string,
): Promise<SentimentResults & { batchExecutionId: string }> => {
  const response = await authApi.post(`/batch/pipeline/sentiment/${projectId}`);
  return response.data;
};

export const runComparisonPipeline = async (
  projectId: string,
): Promise<ComparisonResults & { batchExecutionId: string }> => {
  const response = await authApi.post(`/batch/pipeline/comparison/${projectId}`);
  return response.data;
};

// Full Batch Processing API - Run full batch analysis
export const runFullBatchAnalysis = async (
  projectId: string,
): Promise<{
  batchExecutionId: string;
  results: {
    spontaneous: SpontaneousResults;
    sentiment: SentimentResults;
    comparison: ComparisonResults;
  };
}> => {
  // This calls the backend's full batch process endpoint
  const response = await authApi.post(`/batch/process/${projectId}`);

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to run batch analysis');
  }

  const result = response.data.result;

  if (!result || !result.batchExecutionId) {
    throw new Error('Invalid response from batch processing');
  }

  // Get the batch execution details
  const batchExecution = await getBatchExecution(result.batchExecutionId);

  // Parse the results
  const spontaneousResult = batchExecution.finalResults.find((r) => r.resultType === 'spontaneous');
  const sentimentResult = batchExecution.finalResults.find((r) => r.resultType === 'sentiment');
  const comparisonResult = batchExecution.finalResults.find((r) => r.resultType === 'comparison');

  if (!spontaneousResult || !sentimentResult || !comparisonResult) {
    throw new Error('Missing batch results. Not all pipeline results are available.');
  }

  return {
    batchExecutionId: result.batchExecutionId,
    results: {
      spontaneous: JSON.parse(spontaneousResult.result),
      sentiment: JSON.parse(sentimentResult.result),
      comparison: JSON.parse(comparisonResult.result),
    },
  };
};

// Get all batch executions for a project
export const getBatchExecutions = async (projectId: string): Promise<BatchExecution[]> => {
  const response = await authApi.get(`/batch-executions?projectId=${projectId}`);
  return response.data;
};

// Get a specific batch execution
export const getBatchExecution = async (batchId: string): Promise<BatchExecution> => {
  const response = await authApi.get(`/batch-executions/${batchId}`);
  return response.data;
};

// Trigger batch orchestration with email notification
export const runBatchWithEmailNotification = async (
  projectId: string,
): Promise<{
  success: boolean;
  message: string;
  result: any;
}> => {
  const response = await authApi.post(`/batch/orchestrate/${projectId}`);
  return response.data;
};

// Get all reports for a project
export const getAllProjectReports = async (
  projectId: string,
): Promise<{
  reports: {
    id: string;
    generatedAt: Date;
  }[];
  total: number;
}> => {
  const response = await authApi.get(`/reports/${projectId}/all`);
  return response.data;
};

// Send a report access email to a specific address
export const sendReportEmail = async (
  reportId: string,
  projectId: string,
  email: string,
  subject?: string,
): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await authApi.post('/reports/send-email', {
    reportId,
    projectId,
    email,
    subject,
  });
  return response.data;
};

// Generate a token for a specific report
export const generateReportToken = async (
  reportId: string,
): Promise<{
  token?: string;
  accessUrl?: string;
}> => {
  // Call our new admin endpoint which handles all the logic
  const response = await authApi.post(`/reports/generate-token/${reportId}`);
  return response.data;
};

// Generate a report from batch execution without sending email
export const generateReportFromBatch = async (
  batchExecutionId: string,
): Promise<{
  id: string;
  projectId: string;
  generatedAt: Date;
  date: Date;
  includedTypes?: string[];
  message: string;
}> => {
  const response = await authApi.post(`/reports/generate-from-batch/${batchExecutionId}`);
  return response.data;
};

// Get prompt templates used to generate project prompts
export const getPromptTemplates = async (
  projectId: string,
): Promise<{
  spontaneous: { systemPrompt: string; userPrompt: string };
  direct: { systemPrompt: string; userPrompt: string };
  comparison: { systemPrompt: string; userPrompt: string };
  accuracy: { systemPrompt: string; userPrompt: string };
  brandBattle?: { systemPrompt: string; userPrompt: string };
}> => {
  try {
    const response = await authApi.get(`/prompt-set/templates/${projectId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch prompt templates:', error);
    throw error;
  }
};
