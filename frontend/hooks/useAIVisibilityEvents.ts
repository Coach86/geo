import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api/constants';

interface AIVisibilityEvent {
  projectId: string;
  timestamp: Date;
}

interface CrawlProgressEvent extends AIVisibilityEvent {
  processed: number;
  failed: number;
  total: number;
  currentUrl?: string;
  queueSize?: number;
}

interface IndexProgressEvent extends AIVisibilityEvent {
  indexType: 'bm25' | 'vector';
  progress: number;
  status: string;
}

interface ScanProgressEvent extends AIVisibilityEvent {
  scanId: string;
  progress: number;
  currentQuery?: string;
  totalQueries: number;
}

export function useAIVisibilityEvents(
  projectId: string | undefined,
  onUpdate?: (event?: any) => void
) {
  const onUpdateRef = useRef(onUpdate);
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);
  
  useEffect(() => {
    if (!projectId) return;

    // Parse the API URL to get just the origin (protocol + host + port)
    const url = new URL(API_BASE_URL);
    const socketUrl = `${url.protocol}//${url.host}`;

    console.log('Connecting to WebSocket at:', socketUrl, 'namespace: /batch-events');

    // Connect to the batch-events namespace
    const socket: Socket = io(socketUrl + '/batch-events', {
      path: '/api/socket-io/',
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to AI Visibility WebSocket');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from AI Visibility WebSocket');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // AI Visibility events
    socket.on('aiVisibility:crawl:progress', (event: CrawlProgressEvent) => {
      if (event.projectId === projectId) {
        console.log('Crawl progress:', event);
        onUpdateRef.current?.();
      }
    });

    socket.on('aiVisibility:crawl:completed', (event: AIVisibilityEvent & { result: any }) => {
      if (event.projectId === projectId) {
        console.log('Crawl completed:', event);
        toast.success('Website crawl completed');
        onUpdateRef.current?.();
      }
    });

    socket.on('aiVisibility:index:progress', (event: IndexProgressEvent) => {
      if (event.projectId === projectId) {
        console.log('Index build progress:', event);
        onUpdateRef.current?.();
      }
    });

    socket.on('aiVisibility:index:completed', (event: AIVisibilityEvent & { indexType: string; indexId: string }) => {
      if (event.projectId === projectId) {
        console.log('Index build completed:', event);
        toast.success(`${event.indexType.toUpperCase()} index built successfully`);
        onUpdateRef.current?.();
      }
    });

    socket.on('aiVisibility:scan:progress', (event: ScanProgressEvent) => {
      if (event.projectId === projectId) {
        console.log('Scan progress:', event);
        // Only show toast for major milestones
        if (event.progress === 25 || event.progress === 50 || event.progress === 75) {
          toast.info(`Scan progress: ${event.progress}%`);
        }
        onUpdateRef.current?.({
          type: 'scan:progress',
          ...event
        });
      }
    });

    socket.on('aiVisibility:scan:completed', (event: AIVisibilityEvent & { scanId: string }) => {
      if (event.projectId === projectId) {
        console.log('Scan completed:', event);
        toast.success('AI visibility scan completed');
        onUpdateRef.current?.({
          type: 'scan:completed',
          ...event
        });
      }
    });

    // Audit events for scheduled runs
    socket.on('aiVisibility:audit:started', (event: AIVisibilityEvent & { forceRecrawl?: boolean; deepAnalysis?: boolean }) => {
      if (event.projectId === projectId) {
        console.log('Audit started:', event);
        toast.info('AI visibility audit started');
        onUpdateRef.current?.();
      }
    });

    socket.on('aiVisibility:audit:completed', (event: AIVisibilityEvent & { scanId: string; duration: number; crawledPages: number }) => {
      if (event.projectId === projectId) {
        console.log('Audit completed:', event);
        toast.success(`AI visibility audit completed in ${Math.round(event.duration / 1000)}s`);
        onUpdateRef.current?.();
      }
    });

    socket.on('aiVisibility:audit:failed', (event: AIVisibilityEvent & { error: string }) => {
      if (event.projectId === projectId) {
        console.log('Audit failed:', event);
        toast.error(`AI visibility audit failed: ${event.error}`);
        onUpdateRef.current?.();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [projectId]);
}