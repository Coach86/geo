import axios from 'axios';
import authApi from './auth';
import {
  CompanyIdentityCard,
  PromptSet,
  SpontaneousResults,
  SentimentResults,
  ComparisonResults,
  User,
  BatchExecution,
} from './types';

const API_BASE = '/api/admin';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Company Identity Card API
export const getCompanies = async (): Promise<CompanyIdentityCard[]> => {
  const response = await authApi.get('/identity-card');
  return response.data;
};

export const getCompanyById = async (id: string): Promise<CompanyIdentityCard> => {
  const response = await authApi.get(`/identity-card/${id}`);
  return response.data;
};

export const createCompanyFromUrl = async (
  url: string,
  userId?: string,
  market?: string,
): Promise<CompanyIdentityCard> => {
  const response = await authApi.post('/identity-card/from-url', { url, userId, market });
  return response.data;
};

export const updateCompanyDetails = async (
  id: string,
  data: {
    keyBrandAttributes?: string[];
    competitors?: string[];
  },
): Promise<CompanyIdentityCard> => {
  const response = await authApi.patch(`/identity-card/${id}`, data);
  return response.data;
};

export const deleteCompany = async (id: string): Promise<void> => {
  await authApi.delete(`/identity-card/${id}`);
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
  },
): Promise<User> => {
  const response = await authApi.patch(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: string): Promise<User> => {
  const response = await authApi.delete(`/users/${id}`);
  return response.data;
};

// Config API
export const getConfig = async () => {
  const response = await authApi.get('/config');
  return response.data;
};

// Prompt Set API
export const getPromptSet = async (companyId: string): Promise<PromptSet | null> => {
  try {
    const response = await authApi.get(`/prompt-set/${companyId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const updatePromptSet = async (
  companyId: string,
  data: {
    spontaneous?: string[];
    direct?: string[];
    comparison?: string[];
    accuracy?: string[];
  },
): Promise<PromptSet> => {
  const response = await authApi.patch(`/prompt-set/${companyId}`, data);
  return response.data;
};

export const regeneratePromptSet = async (companyId: string): Promise<PromptSet> => {
  const response = await authApi.post(`/prompt-set/${companyId}/regenerate`);
  return response.data;
};

export const waitForPromptSet = async (
  companyId: string,
  timeout = 30000,
  interval = 2000,
): Promise<PromptSet | null> => {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const promptSet = await getPromptSet(companyId);
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
  companyId: string,
): Promise<SpontaneousResults & { batchExecutionId: string }> => {
  const response = await authApi.post(`/batch/pipeline/spontaneous/${companyId}`);
  return response.data;
};

export const runSentimentPipeline = async (
  companyId: string,
): Promise<SentimentResults & { batchExecutionId: string }> => {
  const response = await authApi.post(`/batch/pipeline/sentiment/${companyId}`);
  return response.data;
};

export const runComparisonPipeline = async (
  companyId: string,
): Promise<ComparisonResults & { batchExecutionId: string }> => {
  const response = await authApi.post(`/batch/pipeline/comparison/${companyId}`);
  return response.data;
};

// Full Batch Processing API - Run full batch analysis
export const runFullBatchAnalysis = async (
  companyId: string,
): Promise<{
  batchExecutionId: string;
  results: {
    spontaneous: SpontaneousResults;
    sentiment: SentimentResults;
    comparison: ComparisonResults;
  };
}> => {
  // This calls the backend's full batch process endpoint
  const response = await authApi.post(`/batch/process/${companyId}`);

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

// Get all batch executions for a company
export const getBatchExecutions = async (companyId: string): Promise<BatchExecution[]> => {
  const response = await authApi.get(`/batch-executions?companyId=${companyId}`);
  return response.data;
};

// Get a specific batch execution
export const getBatchExecution = async (batchId: string): Promise<BatchExecution> => {
  const response = await authApi.get(`/batch-executions/${batchId}`);
  return response.data;
};

// Trigger batch orchestration with email notification
export const runBatchWithEmailNotification = async (
  companyId: string,
): Promise<{
  success: boolean;
  message: string;
  result: any;
}> => {
  const response = await authApi.post(`/batch/orchestrate/${companyId}`);
  return response.data;
};

// Get all reports for a company
export const getAllCompanyReports = async (
  companyId: string,
): Promise<{
  reports: {
    id: string;
    weekStart: Date;
    generatedAt: Date;
  }[];
  total: number;
}> => {
  const response = await authApi.get(`/reports/${companyId}/all`);
  return response.data;
};

// Send a report access email to a specific address
export const sendReportEmail = async (
  reportId: string,
  companyId: string,
  email: string,
  subject?: string,
): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await authApi.post('/reports/send-email', {
    reportId,
    companyId,
    email,
    subject,
  });
  return response.data;
};

// Get prompt templates used to generate company prompts
export const getPromptTemplates = async (
  companyId: string,
): Promise<{
  spontaneous: { systemPrompt: string; userPrompt: string };
  direct: { systemPrompt: string; userPrompt: string };
  comparison: { systemPrompt: string; userPrompt: string };
  accuracy: { systemPrompt: string; userPrompt: string };
}> => {
  try {
    const response = await authApi.get(`/prompt-set/templates/${companyId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch prompt templates:', error);
    throw error;
  }
};
