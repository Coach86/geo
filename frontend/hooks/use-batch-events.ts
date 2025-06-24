"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { Socket } from 'socket.io-client';

export interface BatchEvent {
  batchExecutionId: string;
  projectId: string;
  projectName: string;
  eventType: 'batch_started' | 'pipeline_started' | 'pipeline_completed' | 'pipeline_failed' | 'batch_completed' | 'batch_failed';
  pipelineType?: 'spontaneous' | 'sentiment' | 'comparison' | 'accuracy' | 'full' | 'visibility';
  message: string;
  timestamp: Date;
  progress?: number; // 0-100
  error?: string;
}

interface UseBatchEventsOptions {
  userId?: string;
  token?: string;
  onBatchEvent?: (event: BatchEvent) => void;
}

export function useBatchEvents({ userId, token, onBatchEvent }: UseBatchEventsOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeBatches, setActiveBatches] = useState<Map<string, BatchEvent>>(new Map());
  const onBatchEventRef = useRef(onBatchEvent);

  // Update the ref when onBatchEvent changes
  useEffect(() => {
    onBatchEventRef.current = onBatchEvent;
  }, [onBatchEvent]);

  // Connect to WebSocket for batch events
  useEffect(() => {
    console.log('[useBatchEvents] Initializing with token:', token ? 'present' : 'missing', 'userId:', userId);

    if (!token || !userId) {
      console.log('[useBatchEvents] Missing token or userId, skipping connection');
      return;
    }

    let socketInstance: Socket | null = null;

    // Dynamic import to avoid SSR issues
    import('socket.io-client').then(({ io }) => {
      // Handle incoming batch event
      const handleBatchEvent = (event: BatchEvent) => {
        console.log('[useBatchEvents] Processing batch event:', event);

        // Update active batches
        setActiveBatches(prev => {
          const updated = new Map(prev);
          
          if (event.eventType === 'batch_completed' || event.eventType === 'batch_failed') {
            // Remove completed/failed batches after a delay
            setTimeout(() => {
              setActiveBatches(current => {
                const next = new Map(current);
                next.delete(event.projectId);
                return next;
              });
            }, 5000);
          }
          
          updated.set(event.projectId, event);
          return updated;
        });

        // Show toast notifications for important events
        if (event.eventType === 'batch_started') {
          toast.info(`Starting analysis for ${event.projectName}`, {
            description: event.message,
            duration: 3000,
          });
        } else if (event.eventType === 'batch_completed') {
          toast.success(`Analysis completed for ${event.projectName}`, {
            description: event.message,
            duration: 5000,
          });
        } else if (event.eventType === 'batch_failed') {
          toast.error(`Analysis failed for ${event.projectName}`, {
            description: event.error || event.message,
            duration: 8000,
          });
        }

        // Call custom handler if provided
        if (onBatchEventRef.current) {
          onBatchEventRef.current(event);
        }
      };

      // Socket.IO Configuration
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const serverUrl = apiUrl.replace(/\/api\/?$/, '');
      
      console.log('[useBatchEvents] Connecting to batch events:');
      console.log('  - Server URL:', serverUrl);
      console.log('  - Namespace:', '/batch-events');

      // Connect to batch-events namespace
      socketInstance = io(`${serverUrl}/batch-events`, {
        path: '/api/socket-io/',
        auth: {
          token,
        },
        query: {
          token,
        },
        transports: ['websocket', 'polling'],
      });

      socketInstance.on('connect', () => {
        console.log('[useBatchEvents] Connected to batch events service');
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('[useBatchEvents] Disconnected from batch events service');
        setIsConnected(false);
      });

      socketInstance.on('batch_event', (data: BatchEvent) => {
        console.log('[useBatchEvents] Batch event received:', data);
        handleBatchEvent(data);
      });

      socketInstance.on('connect_error', (error: any) => {
        console.error('[useBatchEvents] Connection error:', error.message);
        console.error('[useBatchEvents] Error details:', error);
      });

      socketRef.current = socketInstance;
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, userId]);

  // Get batch status for a specific project
  const getBatchStatus = useCallback((projectId: string): BatchEvent | null => {
    return activeBatches.get(projectId) || null;
  }, [activeBatches]);

  // Check if a project has an active batch
  const isProcessing = useCallback((projectId: string): boolean => {
    const batch = activeBatches.get(projectId);
    return batch?.eventType === 'batch_started' || 
           batch?.eventType === 'pipeline_started' || 
           batch?.eventType === 'pipeline_completed';
  }, [activeBatches]);

  // Get processing progress for a project
  const getProgress = useCallback((projectId: string): number => {
    const batch = activeBatches.get(projectId);
    return batch?.progress || 0;
  }, [activeBatches]);

  return {
    isConnected,
    activeBatches: Array.from(activeBatches.values()),
    getBatchStatus,
    isProcessing,
    getProgress,
  };
}