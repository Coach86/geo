"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useBatchEvents, BatchEvent } from '@/hooks/use-batch-events';

interface BatchEventsContextType {
  isConnected: boolean;
  activeBatches: BatchEvent[];
  getBatchStatus: (projectId: string) => BatchEvent | null;
  isProcessing: (projectId: string) => boolean;
  getProgress: (projectId: string) => number;
}

const BatchEventsContext = createContext<BatchEventsContextType | undefined>(undefined);

export function BatchEventsProvider({ children }: { children: ReactNode }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  console.log('[BatchEventsProvider] Initializing with token:', token ? 'present' : 'missing', 'userId:', userId);

  const batchEventsHooks = useBatchEvents({
    userId: userId || undefined,
    token: token || undefined,
    onBatchEvent: (event) => {
      console.log('[BatchEventsProvider] Batch event received:', event);
      
      // Trigger custom events for components that need to react to batch events
      if (event.eventType === 'batch_completed') {
        window.dispatchEvent(new CustomEvent('batch-completed', {
          detail: { projectId: event.projectId, batchExecutionId: event.batchExecutionId }
        }));
      }
    }
  });

  return (
    <BatchEventsContext.Provider value={batchEventsHooks}>
      {children}
    </BatchEventsContext.Provider>
  );
}

export function useBatchEventsContext() {
  const context = useContext(BatchEventsContext);
  if (context === undefined) {
    throw new Error('useBatchEventsContext must be used within a BatchEventsProvider');
  }
  return context;
}