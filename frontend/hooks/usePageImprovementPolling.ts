import { useEffect, useRef, useCallback } from 'react';

interface UsePageImprovementPollingProps {
  jobId: string;
  isProcessing: boolean;
  onStatusUpdate: () => Promise<void>;
  interval?: number;
}

export function usePageImprovementPolling({
  jobId,
  isProcessing,
  onStatusUpdate,
  interval = 10000,
}: UsePageImprovementPollingProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(() => {
      onStatusUpdate();
    }, interval);
  }, [interval, onStatusUpdate]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isProcessing) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isProcessing, startPolling, stopPolling]);

  return { startPolling, stopPolling };
}