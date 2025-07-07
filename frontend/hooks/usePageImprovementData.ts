import { useState } from 'react';
import { apiFetch } from '@/lib/api/utils';

export interface ImprovementIteration {
  iteration: number;
  improvedContent: string;
  improvedTitle?: string;
  improvedMetaDescription?: string;
  scoreBefore: number;
  scoreAfter: number;
  issues: string[];
  recommendations: string[];
  timestamp: Date;
}

export interface PageImprovementJob {
  jobId: string;
  projectId: string;
  pageUrl: string;
  originalContent: string;
  originalTitle?: string;
  originalMetaDescription?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentIteration: number;
  maxIterations: number;
  improvements: ImprovementIteration[];
  errors: string[];
  createdAt: Date;
  completedAt?: Date;
  failedAt?: Date;
}

export interface PageImprovementState {
  job: PageImprovementJob | null;
  loading: boolean;
  error: string | null;
  progress: number;
  currentScore?: number;
  previousScore?: number;
}

export function usePageImprovementData() {
  const [state, setState] = useState<PageImprovementState>({
    job: null,
    loading: true,
    error: null,
    progress: 0,
    currentScore: undefined,
    previousScore: undefined,
  });

  const updateJob = (job: PageImprovementJob | null) => {
    if (!job) {
      setState(prev => ({ ...prev, job: null }));
      return;
    }

    const prog = (job.currentIteration / job.maxIterations) * 100;
    const lastImprovement = job.improvements[job.improvements.length - 1];

    setState(prev => ({
      ...prev,
      job,
      progress: Math.min(100, prog),
      currentScore: lastImprovement?.scoreAfter,
      previousScore: lastImprovement?.scoreBefore,
    }));
  };

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const updateProgress = (progress: number) => {
    setState(prev => ({ ...prev, progress }));
  };

  const updateScores = (current?: number, previous?: number) => {
    setState(prev => ({
      ...prev,
      currentScore: current ?? prev.currentScore,
      previousScore: previous ?? prev.previousScore,
    }));
  };

  const fetchJob = async (jobId: string, token: string): Promise<PageImprovementJob | null> => {
    try {
      setError(null);
      const result = await apiFetch(`/page-magic/improvement/${jobId}`, { token });
      console.log('Fetched job data:', result.data);
      console.log('Job status:', result.data?.status);
      console.log('Improvements length:', result.data?.improvements?.length);
      console.log('Improvements:', result.data?.improvements);
      console.log('First improvement:', result.data?.improvements?.[0]);
      updateJob(result.data);
      return result.data;
    } catch (err) {
      console.error('Error fetching job details:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async (jobId: string, token: string): Promise<any> => {
    try {
      const result = await apiFetch(`/page-magic/improvement/${jobId}/status`, { token });
      if (result.data) {
        updateProgress(result.data.progress);
        updateScores(result.data.currentScore, result.data.previousScore);
      }
      return result.data;
    } catch (err) {
      console.error('Error fetching job status:', err);
      return null;
    }
  };

  return {
    state,
    updateJob,
    setLoading,
    setError,
    updateProgress,
    updateScores,
    fetchJob,
    fetchStatus,
  };
}