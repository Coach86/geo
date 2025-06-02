import axios from 'axios';
import {
  SpontaneousResults,
  SentimentResults,
  ComparisonResults,
  AccuracyResults,
  BatchExecution,
  BatchResult,
  RawResponse,
} from './types';
import authApi from './auth';

const API_BASE = '/api/admin';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Batch Pipeline API with polling
export const runSpontaneousPipeline = async (projectId: string): Promise<SpontaneousResults> => {
  // Start the pipeline and get batch execution ID
  const response = await authApi.post(`/batch/pipeline/spontaneous/${projectId}`);

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to start spontaneous pipeline');
  }

  const batchExecutionId = response.data.batchExecutionId;

  // Poll for completion
  const batchExecution = await pollBatchExecution(batchExecutionId);

  // Find the spontaneous result
  const spontaneousResult = batchExecution.finalResults.find(
    (r: BatchResult) => r.resultType === 'spontaneous',
  );

  if (!spontaneousResult) {
    throw new Error('Spontaneous pipeline results not found');
  }

  return JSON.parse(spontaneousResult.result);
};

export const runSentimentPipeline = async (projectId: string): Promise<SentimentResults> => {
  // Start the pipeline and get batch execution ID
  const response = await authApi.post(`/batch/pipeline/sentiment/${projectId}`);

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to start sentiment pipeline');
  }

  const batchExecutionId = response.data.batchExecutionId;

  // Poll for completion
  const batchExecution = await pollBatchExecution(batchExecutionId);

  // Find the sentiment result
  const sentimentResult = batchExecution.finalResults.find(
    (r: BatchResult) => r.resultType === 'sentiment',
  );

  if (!sentimentResult) {
    throw new Error('Sentiment pipeline results not found');
  }

  return JSON.parse(sentimentResult.result);
};

export const runComparisonPipeline = async (projectId: string): Promise<ComparisonResults> => {
  // Start the pipeline and get batch execution ID
  const response = await authApi.post(`/batch/pipeline/comparison/${projectId}`);

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to start comparison pipeline');
  }

  const batchExecutionId = response.data.batchExecutionId;

  // Poll for completion
  const batchExecution = await pollBatchExecution(batchExecutionId);

  // Find the comparison result
  const comparisonResult = batchExecution.finalResults.find(
    (r: BatchResult) => r.resultType === 'comparison',
  );

  if (!comparisonResult) {
    throw new Error('Comparison pipeline results not found');
  }

  return JSON.parse(comparisonResult.result);
};

export const runAccuracyPipeline = async (projectId: string): Promise<AccuracyResults> => {
  // Start the pipeline and get batch execution ID
  const response = await authApi.post(`/batch/pipeline/accuracy/${projectId}`);

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to start accuracy pipeline');
  }

  const batchExecutionId = response.data.batchExecutionId;

  // Poll for completion
  const batchExecution = await pollBatchExecution(batchExecutionId);

  // Find the accuracy result
  const accuracyResult = batchExecution.finalResults.find(
    (r: BatchResult) => r.resultType === 'accuracy',
  );

  if (!accuracyResult) {
    throw new Error('Accuracy pipeline results not found');
  }

  return JSON.parse(accuracyResult.result);
};

// Full Batch Processing API with polling mechanism
export const runFullBatchAnalysis = async (
  projectId: string,
): Promise<{
  batchExecutionId: string;
  alreadyRunning?: boolean;
}> => {
  // Start the batch analysis process - check if a batch is already in progress first
  try {
    // This just starts the batch and gets the ID - doesn't wait for completion
    const response = await authApi.post(`/batch/process/${projectId}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to run batch analysis');
    }

    const batchExecutionId = response.data.batchExecutionId;
    const alreadyRunning = response.data.alreadyRunning || false;
    
    // Return the ID and whether it was already running
    return { 
      batchExecutionId,
      alreadyRunning 
    };
    
  } catch (error) {
    console.error('Error starting batch analysis:', error);
    throw error;
  }
};

// Poll for batch execution completion
export const pollBatchExecution = async (
  batchExecutionId: string,
  maxAttempts = 30, // Around 5 minutes of polling (10 seconds between attempts)
  intervalMs = 10000,
): Promise<BatchExecution> => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const batchExecution = await getBatchExecution(batchExecutionId);

    // If the batch is completed or failed, return it
    if (batchExecution.status === 'completed' || batchExecution.status === 'failed') {
      return batchExecution;
    }

    // Wait for the next interval
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;
  }

  throw new Error('Batch execution timed out after multiple polling attempts');
};

// Batch Execution API
export const getBatchExecution = async (batchExecutionId: string): Promise<BatchExecution> => {
  // authApi already includes the /api/admin prefix
  const response = await authApi.get(`/batch-executions/${batchExecutionId}`);
  return response.data;
};

export const getBatchExecutionRawResponses = async (
  batchExecutionId: string,
): Promise<RawResponse[]> => {
  // authApi already includes the /api/admin prefix
  const response = await authApi.get(`/raw-responses/batch-execution/${batchExecutionId}`);
  return response.data;
};

export const getBatchExecutionsByProject = async (projectId: string): Promise<BatchExecution[]> => {
  // authApi already includes the /api/admin prefix
  const response = await authApi.get(`/batch-executions?projectId=${projectId}`);
  return response.data;
};
