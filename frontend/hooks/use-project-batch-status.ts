"use client";

import { useEffect, useState, useCallback } from 'react';
import { useBatchEventsContext } from '@/providers/batch-events-provider';

interface BatchStatus {
  isRunning: boolean;
  batchExecutionId?: string;
  status?: string;
  startedAt?: Date;
}

export function useProjectBatchStatus(projectId: string | null | undefined, token?: string) {
  const [batchStatus, setBatchStatus] = useState<BatchStatus>({ isRunning: false });
  const [isLoading, setIsLoading] = useState(true);
  const { isProcessing } = useBatchEventsContext();

  // Fetch initial batch status from API
  const fetchBatchStatus = useCallback(async () => {
    if (!projectId || !token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/project/${projectId}/batch-status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBatchStatus(data);
      } else {
        console.error('Failed to fetch batch status:', response.statusText);
        setBatchStatus({ isRunning: false });
      }
    } catch (error) {
      console.error('Error fetching batch status:', error);
      setBatchStatus({ isRunning: false });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, token]);

  // Initial fetch
  useEffect(() => {
    fetchBatchStatus();
  }, [fetchBatchStatus]);

  // Check WebSocket status
  const isProcessingFromWebSocket = projectId ? isProcessing(projectId) : false;

  // Combine API and WebSocket status
  const isRunning = batchStatus.isRunning || isProcessingFromWebSocket;

  // Listen for batch completion events to refresh status
  useEffect(() => {
    if (!projectId) return;

    const handleBatchCompleted = (event: CustomEvent) => {
      if (event.detail.projectId === projectId) {
        // When batch completes, update status after a small delay
        setTimeout(() => {
          setBatchStatus({ isRunning: false });
        }, 1000);
      }
    };

    window.addEventListener('batch-completed' as any, handleBatchCompleted);
    return () => {
      window.removeEventListener('batch-completed' as any, handleBatchCompleted);
    };
  }, [projectId]);

  return {
    isRunning,
    isLoading,
    batchStatus,
    refetch: fetchBatchStatus,
  };
}