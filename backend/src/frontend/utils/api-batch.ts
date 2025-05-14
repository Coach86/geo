import axios from 'axios';
import {
  SpontaneousResults,
  SentimentResults,
  ComparisonResults,
  BatchExecution,
  BatchResult,
  RawResponse
} from './types';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Batch Pipeline API
export const runSpontaneousPipeline = async (companyId: string): Promise<SpontaneousResults> => {
  const response = await api.post(`/batch/pipeline/spontaneous/${companyId}`);
  return response.data;
};

export const runSentimentPipeline = async (companyId: string): Promise<SentimentResults> => {
  const response = await api.post(`/batch/pipeline/sentiment/${companyId}`);
  return response.data;
};

export const runComparisonPipeline = async (companyId: string): Promise<ComparisonResults> => {
  const response = await api.post(`/batch/pipeline/comparison/${companyId}`);
  return response.data;
};

// Full Batch Processing API
export const runFullBatchAnalysis = async (companyId: string): Promise<{
  batchExecutionId: string;
  results: {
    spontaneous: SpontaneousResults;
    sentiment: SentimentResults;
    comparison: ComparisonResults;
  }
}> => {
  // Run a full batch analysis for a company
  const response = await api.post(`/batch/process/${companyId}`);

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to run batch analysis');
  }

  // Get the batch execution details
  const batchExecution = await getBatchExecution(response.data.batchExecutionId);

  // Parse the results
  const spontaneousResult = batchExecution.finalResults.find((r: BatchResult) => r.resultType === 'spontaneous');
  const sentimentResult = batchExecution.finalResults.find((r: BatchResult) => r.resultType === 'sentiment');
  const comparisonResult = batchExecution.finalResults.find((r: BatchResult) => r.resultType === 'comparison');

  if (!spontaneousResult || !sentimentResult || !comparisonResult) {
    throw new Error('Missing batch results. Not all pipeline results are available.');
  }

  const results = {
    spontaneous: JSON.parse(spontaneousResult.result),
    sentiment: JSON.parse(sentimentResult.result),
    comparison: JSON.parse(comparisonResult.result)
  };

  return {
    batchExecutionId: response.data.batchExecutionId,
    results
  };
};

// Batch Execution API
export const getBatchExecution = async (batchExecutionId: string): Promise<BatchExecution> => {
  const response = await api.get(`/batch-executions/${batchExecutionId}`);
  return response.data;
};

export const getBatchExecutionRawResponses = async (batchExecutionId: string): Promise<RawResponse[]> => {
  const response = await api.get(`/batch-executions/${batchExecutionId}/raw-responses`);
  return response.data;
};

export const getBatchExecutionsByCompany = async (companyId: string): Promise<BatchExecution[]> => {
  const response = await api.get(`/batch-executions?companyId=${companyId}`);
  return response.data;
};