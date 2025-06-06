import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

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
  onUpdate?: () => void
) {
  useEffect(() => {
    if (!projectId) return;

    // Connect to the batch-events namespace
    const socket: Socket = io('/batch-events', {
      path: '/api/socket-io/',
      transports: ['websocket', 'polling'],
    });

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to AI Visibility WebSocket');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from AI Visibility WebSocket');
    });

    // AI Visibility events
    socket.on('aiVisibility:crawl:progress', (event: CrawlProgressEvent) => {
      if (event.projectId === projectId) {
        console.log('Crawl progress:', event);
        onUpdate?.();
      }
    });

    socket.on('aiVisibility:crawl:completed', (event: AIVisibilityEvent & { result: any }) => {
      if (event.projectId === projectId) {
        console.log('Crawl completed:', event);
        toast.success('Website crawl completed');
        onUpdate?.();
      }
    });

    socket.on('aiVisibility:index:progress', (event: IndexProgressEvent) => {
      if (event.projectId === projectId) {
        console.log('Index build progress:', event);
        onUpdate?.();
      }
    });

    socket.on('aiVisibility:index:completed', (event: AIVisibilityEvent & { indexType: string; indexId: string }) => {
      if (event.projectId === projectId) {
        console.log('Index build completed:', event);
        toast.success(`${event.indexType.toUpperCase()} index built successfully`);
        onUpdate?.();
      }
    });

    socket.on('aiVisibility:scan:progress', (event: ScanProgressEvent) => {
      if (event.projectId === projectId) {
        console.log('Scan progress:', event);
        if (event.progress % 10 === 0) {
          toast.info(`Scan progress: ${event.progress}%`);
        }
        onUpdate?.();
      }
    });

    socket.on('aiVisibility:scan:completed', (event: AIVisibilityEvent & { scanId: string }) => {
      if (event.projectId === projectId) {
        console.log('Scan completed:', event);
        toast.success('AI visibility scan completed');
        onUpdate?.();
      }
    });

    // Audit events for scheduled runs
    socket.on('aiVisibility:audit:started', (event: AIVisibilityEvent & { forceRecrawl?: boolean; deepAnalysis?: boolean }) => {
      if (event.projectId === projectId) {
        console.log('Audit started:', event);
        toast.info('AI visibility audit started');
        onUpdate?.();
      }
    });

    socket.on('aiVisibility:audit:completed', (event: AIVisibilityEvent & { scanId: string; duration: number; crawledPages: number }) => {
      if (event.projectId === projectId) {
        console.log('Audit completed:', event);
        toast.success(`AI visibility audit completed in ${Math.round(event.duration / 1000)}s`);
        onUpdate?.();
      }
    });

    socket.on('aiVisibility:audit:failed', (event: AIVisibilityEvent & { error: string }) => {
      if (event.projectId === projectId) {
        console.log('Audit failed:', event);
        toast.error(`AI visibility audit failed: ${event.error}`);
        onUpdate?.();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [projectId, onUpdate]);
}