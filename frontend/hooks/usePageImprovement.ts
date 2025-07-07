import { useEffect, useRef } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { usePageImprovementData } from './usePageImprovementData';
import { usePageImprovementEvents } from './usePageImprovementEvents';

export type { ImprovementIteration, PageImprovementJob } from './usePageImprovementData';

export interface UsePageImprovementReturn {
  job: ReturnType<typeof usePageImprovementData>['state']['job'];
  loading: boolean;
  error: string | null;
  progress: number;
  currentScore?: number;
  previousScore?: number;
  refetch: () => void;
}

export function usePageImprovement(jobId: string): UsePageImprovementReturn {
  const { token } = useAuth();
  const { 
    state, 
    updateProgress, 
    updateScores, 
    fetchJob, 
    fetchStatus 
  } = usePageImprovementData();
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Handle WebSocket events
  usePageImprovementEvents({
    jobId,
    onProgressUpdate: updateProgress,
    onScoreUpdate: updateScores,
    onComplete: () => {
      console.log('[usePageImprovement] Job completed event received, fetching final state...');
      console.log('[usePageImprovement] Token available:', !!token);
      
      // Stop polling and fetch final state
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Always fetch on completion, regardless of mounted state
      if (token) {
        // Add a longer delay to ensure the backend has saved the data
        console.log('[usePageImprovement] Scheduling fetch in 2 seconds...');
        setTimeout(() => {
          console.log('[usePageImprovement] Fetching completed job data after delay...');
          fetchJob(jobId, token).then(() => {
            console.log('[usePageImprovement] Fetch completed successfully');
          }).catch((error) => {
            console.error('[usePageImprovement] Fetch failed:', error);
          });
        }, 2000); // Increased to 2 seconds
      } else {
        console.warn('[usePageImprovement] Cannot fetch - no token available');
      }
    },
  });

  // Initial fetch
  useEffect(() => {
    if (!jobId || !token) return;

    fetchJob(jobId, token);

    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
    // Only run on mount and when jobId/token changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, token]);

  // Status polling - separate effect to avoid circular dependencies
  useEffect(() => {
    if (!jobId || !token) return;
    
    // Poll regardless of status to ensure we get the latest data
    const shouldPoll = !state.job || state.job.status === 'processing' || state.job.improvements.length === 0;
    
    if (!shouldPoll && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      return;
    }

    // Start polling
    if (shouldPoll && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(() => {
        if (!isMountedRef.current) return;
        console.log('[usePageImprovement] Polling for job updates...', new Date().toISOString());
        // Fetch full job data instead of just status
        fetchJob(jobId, token).then((job) => {
          if (job && job.status === 'completed' && job.improvements.length > 0) {
            console.log('[usePageImprovement] Job completed with improvements, stopping polling');
            console.log('[usePageImprovement] Job improvements:', job.improvements.length);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          } else {
            console.log('[usePageImprovement] Polling continues - status:', job?.status, 'improvements:', job?.improvements?.length);
          }
        });
      }, 2000); // Poll every 2 seconds for faster updates
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // Only depend on job data to avoid complex dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.job?.status, state.job?.improvements?.length, jobId, token]);

  const refetch = () => {
    if (jobId && token) {
      fetchJob(jobId, token);
    }
  };

  return {
    job: state.job,
    loading: state.loading,
    error: state.error,
    progress: state.progress,
    currentScore: state.currentScore,
    previousScore: state.previousScore,
    refetch,
  };
}