import axios from 'axios';
import {
  SpontaneousResults,
  SentimentResults,
  ComparisonResults,
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
export const runSpontaneousPipeline = async (companyId: string): Promise<SpontaneousResults> => {
  // Start the pipeline and get batch execution ID
  const response = await authApi.post(`/batch/pipeline/spontaneous/${companyId}`);

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

export const runSentimentPipeline = async (companyId: string): Promise<SentimentResults> => {
  // Start the pipeline and get batch execution ID
  const response = await authApi.post(`/batch/pipeline/sentiment/${companyId}`);

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

export const runComparisonPipeline = async (companyId: string): Promise<ComparisonResults> => {
  // Start the pipeline and get batch execution ID
  const response = await authApi.post(`/batch/pipeline/comparison/${companyId}`);

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

// Full Batch Processing API with polling mechanism
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
  // Start the batch analysis process
  const response = await authApi.post(`/batch/process/${companyId}`);

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to run batch analysis');
  }

  const batchExecutionId = response.data.batchExecutionId;

  // Poll for completion
  const batchExecution = await pollBatchExecution(batchExecutionId);

  // Parse the results
  const spontaneousResult = batchExecution.finalResults.find(
    (r: BatchResult) => r.resultType === 'spontaneous',
  );
  const sentimentResult = batchExecution.finalResults.find(
    (r: BatchResult) => r.resultType === 'sentiment',
  );
  const comparisonResult = batchExecution.finalResults.find(
    (r: BatchResult) => r.resultType === 'comparison',
  );

  if (!spontaneousResult || !sentimentResult || !comparisonResult) {
    throw new Error('Missing batch results. Not all pipeline results are available.');
  }

  const results = {
    spontaneous: JSON.parse(spontaneousResult.result),
    sentiment: JSON.parse(sentimentResult.result),
    comparison: JSON.parse(comparisonResult.result),
  };

  return {
    batchExecutionId,
    results,
  };
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
  const response = await authApi.get(`/batch-executions/${batchExecutionId}`);
  return response.data;
};

export const getBatchExecutionRawResponses = async (
  batchExecutionId: string,
): Promise<RawResponse[]> => {
  const response = await authApi.get(`/batch-executions/${batchExecutionId}/raw-responses`);
  return response.data;
};

export const getBatchExecutionsByCompany = async (companyId: string): Promise<BatchExecution[]> => {
  const response = await authApi.get(`/batch-executions?companyId=${companyId}`);
  return response.data;
};
