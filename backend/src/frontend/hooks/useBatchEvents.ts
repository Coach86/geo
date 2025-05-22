/**
 * React hook for managing batch events via Socket.IO
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { socketManager, BatchEvent } from '../utils/socket';
import { showBatchCompletionNotification } from '../utils/notifications';

export interface BatchStatus {
  batchExecutionId: string;
  companyId: string;
  companyName: string;
  pipelineType: string;
  status: 'started' | 'processing' | 'completed' | 'failed';
  progress: number;
  lastEvent?: BatchEvent;
  error?: string;
}

export interface UseBatchEventsReturn {
  activeBatches: Map<string, BatchStatus>;
  hasActiveBatches: boolean;
  subscribeToBatch: (batchExecutionId: string) => void;
  unsubscribeFromBatch: (batchExecutionId: string) => void;
  clearBatch: (batchExecutionId: string) => void;
  clearAllBatches: () => void;
}

export const useBatchEvents = (): UseBatchEventsReturn => {
  const [activeBatches, setActiveBatches] = useState<Map<string, BatchStatus>>(new Map());
  const [subscriptions] = useState<Map<string, () => void>>(new Map());
  const updateBatchStatusRef = useRef<((event: BatchEvent) => void) | null>(null);

  // Update batch status based on events
  const updateBatchStatus = useCallback((event: BatchEvent) => {
    console.log('Updating batch status for batch:', event.batchExecutionId);
    setActiveBatches((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(event.batchExecutionId);

      let status: BatchStatus['status'] = 'started';
      let progress = event.progress || 0;

      switch (event.eventType) {
        case 'batch_started':
          status = 'started';
          progress = 0;
          break;
        case 'pipeline_started':
          status = 'processing';
          progress = event.progress || 25;
          break;
        case 'pipeline_completed':
          // For single pipeline batches, pipeline_completed means the batch is done
          status = 'completed';
          progress = 100;
          // Show browser notification
          showBatchCompletionNotification(
            event.companyName,
            event.pipelineType || 'pipeline',
            true,
          );
          break;
        case 'batch_completed':
          status = 'completed';
          progress = 100;
          // Show browser notification
          showBatchCompletionNotification(event.companyName, event.pipelineType || 'batch', true);
          break;
        case 'pipeline_failed':
        case 'batch_failed':
          status = 'failed';
          // Show browser notification
          showBatchCompletionNotification(event.companyName, event.pipelineType || 'batch', false);
          break;
      }

      const updated: BatchStatus = {
        ...existing, // Spread existing first to be overridden by new values
        batchExecutionId: event.batchExecutionId,
        companyId: event.companyId,
        companyName: event.companyName,
        pipelineType: event.pipelineType || 'unknown',
        status, // This will now properly override the existing status
        progress,
        lastEvent: event,
        error: event.error,
      };

      console.log('useBatchEvents - Setting batch with status:', status, 'for ID:', event.batchExecutionId);
      newMap.set(event.batchExecutionId, updated);
      console.log('useBatchEvents - New map size:', newMap.size);
      console.log('useBatchEvents - Map contents:', Array.from(newMap.entries()));
      return newMap;
    });
  }, []);

  // Keep ref updated
  updateBatchStatusRef.current = updateBatchStatus;

  // Subscribe to a specific batch
  const subscribeToBatch = useCallback(
    (batchExecutionId: string) => {
      console.log('Subscribing to batch:', batchExecutionId);
      if (subscriptions.has(batchExecutionId)) {
        return; // Already subscribed
      }

      const unsubscribe = socketManager.subscribeToBatchEvents(batchExecutionId, updateBatchStatus);
      subscriptions.set(batchExecutionId, unsubscribe);
    },
    [updateBatchStatus, subscriptions],
  );

  // Unsubscribe from a specific batch
  const unsubscribeFromBatch = useCallback(
    (batchExecutionId: string) => {
      const unsubscribe = subscriptions.get(batchExecutionId);
      if (unsubscribe) {
        unsubscribe();
        subscriptions.delete(batchExecutionId);
      }
    },
    [subscriptions],
  );

  // Clear a specific batch from active list
  const clearBatch = useCallback(
    (batchExecutionId: string) => {
      setActiveBatches((prev) => {
        const newMap = new Map(prev);
        newMap.delete(batchExecutionId);
        return newMap;
      });
      unsubscribeFromBatch(batchExecutionId);
    },
    [unsubscribeFromBatch],
  );

  // Clear all batches
  const clearAllBatches = useCallback(() => {
    // Unsubscribe from all
    subscriptions.forEach((unsubscribe) => unsubscribe());
    subscriptions.clear();

    // Clear all batches
    setActiveBatches(new Map());
  }, [subscriptions]);

  // Subscribe to global events (for notifications) - only once
  useEffect(() => {
    console.log('useBatchEvents - Setting up global subscription');
    const unsubscribeGlobal = socketManager.subscribeToAllBatchEvents((event: BatchEvent) => {
      if (updateBatchStatusRef.current) {
        updateBatchStatusRef.current(event);
      }
    });

    return () => {
      console.log('useBatchEvents - Cleaning up global subscription');
      unsubscribeGlobal();
    };
  }, []); // No dependencies to prevent multiple subscriptions

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      subscriptions.clear();
    };
  }, [subscriptions]);

  // Auto-clear completed/failed batches after some time
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBatches((prev) => {
        const newMap = new Map(prev);
        const now = Date.now();

        for (const [batchId, batch] of Array.from(newMap.entries())) {
          if (batch.status === 'completed' || batch.status === 'failed') {
            const eventTime = batch.lastEvent ? new Date(batch.lastEvent.timestamp).getTime() : 0;
            // Auto-clear after 5 seconds
            if (now - eventTime > 5000) {
              newMap.delete(batchId);
              unsubscribeFromBatch(batchId);
            }
          }
        }

        return newMap;
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [unsubscribeFromBatch]);

  // Only count batches that are not completed or failed as "active"
  const batchStatuses = Array.from(activeBatches.values()).map(batch => batch.status);
  const hasActiveBatches = Array.from(activeBatches.values()).some(batch => 
    batch.status !== 'completed' && batch.status !== 'failed'
  );
  
  console.log('useBatchEvents - Batch statuses:', batchStatuses);
  console.log('useBatchEvents - hasActiveBatches calculation:', hasActiveBatches);

  return {
    activeBatches,
    hasActiveBatches,
    subscribeToBatch,
    unsubscribeFromBatch,
    clearBatch,
    clearAllBatches,
  };
};
