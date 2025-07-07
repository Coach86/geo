"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { Socket } from 'socket.io-client';

export interface CrawlerEvent {
  projectId: string;
  eventType: 'crawler.started' | 'crawler.progress' | 'crawler.page_crawled' | 'crawler.completed' | 'crawler.failed';
  currentUrl?: string;
  crawledPages?: number;
  totalPages?: number;
  progress?: number; // 0-100
  status?: 'started' | 'crawling' | 'analyzing' | 'completed' | 'analysis_completed' | 'failed';
  message?: string;
  error?: string;
  timestamp: Date;
}

interface UseCrawlerEventsOptions {
  projectId?: string;
  token?: string;
  onCrawlerEvent?: (event: CrawlerEvent) => void;
}

export function useCrawlerEvents({ projectId, token, onCrawlerEvent }: UseCrawlerEventsOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [crawlerStatus, setCrawlerStatus] = useState<CrawlerEvent | null>(null);
  const onCrawlerEventRef = useRef(onCrawlerEvent);
  const projectIdRef = useRef(projectId);

  // Update refs when props change
  useEffect(() => {
    onCrawlerEventRef.current = onCrawlerEvent;
  }, [onCrawlerEvent]);

  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  // Handle incoming crawler event - stable callback
  const handleCrawlerEvent = useCallback((event: CrawlerEvent) => {
    console.log('[useCrawlerEvents] Processing crawler event:', event);

    // Only process events for our project
    if (event.projectId !== projectIdRef.current) {
      return;
    }

    // Update crawler status
    setCrawlerStatus(event);

    // Call custom handler if provided
    if (onCrawlerEventRef.current) {
      onCrawlerEventRef.current(event);
    }
  }, []);

  // Connect to WebSocket for crawler events
  useEffect(() => {
    console.log('[useCrawlerEvents] Initializing with token:', token ? 'present' : 'missing', 'projectId:', projectId);

    if (!token || !projectId) {
      console.log('[useCrawlerEvents] Missing token or projectId, skipping connection');
      return;
    }

    let socketInstance: Socket | null = null;

    // Dynamic import to avoid SSR issues
    import('socket.io-client').then(({ io }) => {

      // Socket.IO Configuration
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const serverUrl = apiUrl.replace(/\/api\/?$/, '');
      
      console.log('[useCrawlerEvents] Connecting to crawler events:');
      console.log('  - Server URL:', serverUrl);
      console.log('  - Namespace:', '/crawler-events');

      // Connect to crawler-events namespace (we might need to create this or use the existing namespace)
      socketInstance = io(`${serverUrl}`, {
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
        console.log('[useCrawlerEvents] Connected to crawler events service');
        setIsConnected(true);
        
        // Subscribe to crawler events for this project
        socketInstance?.emit('subscribe_crawler', { projectId });
      });

      socketInstance.on('disconnect', () => {
        console.log('[useCrawlerEvents] Disconnected from crawler events service');
        setIsConnected(false);
      });

      // Listen for crawler events
      socketInstance.on('crawler.started', (data: CrawlerEvent) => {
        console.log('[useCrawlerEvents] Crawler started event received:', data);
        handleCrawlerEvent({ ...data, eventType: 'crawler.started' });
      });

      socketInstance.on('crawler.progress', (data: any) => {
        console.log('[useCrawlerEvents] Crawler progress event received:', data);
        // Extract relevant data from crawler.progress event
        const event: CrawlerEvent = {
          projectId: data.projectId,
          eventType: 'crawler.progress',
          currentUrl: data.url,
          crawledPages: data.crawledPages,
          totalPages: data.totalPages,
          progress: data.progress,
          timestamp: new Date(),
        };
        handleCrawlerEvent(event);
      });

      socketInstance.on('page_crawled', (data: any) => {
        console.log('[useCrawlerEvents] Page crawled event received:', data);
        // Extract relevant data from page_crawled event
        const event: CrawlerEvent = {
          projectId: data.projectId,
          eventType: 'crawler.page_crawled',
          currentUrl: data.url,
          crawledPages: data.crawledPages,
          totalPages: data.totalPages,
          progress: data.totalPages > 0 ? Math.round((data.crawledPages / data.totalPages) * 100) : 0,
          timestamp: new Date(),
        };
        handleCrawlerEvent(event);
      });

      socketInstance.on('crawler.completed', (data: CrawlerEvent) => {
        console.log('[useCrawlerEvents] Crawler completed event received:', data);
        handleCrawlerEvent({ ...data, eventType: 'crawler.completed' });
      });

      socketInstance.on('crawler.failed', (data: CrawlerEvent) => {
        console.log('[useCrawlerEvents] Crawler failed event received:', data);
        handleCrawlerEvent({ ...data, eventType: 'crawler.failed' });
      });

      socketInstance.on('connect_error', (error: any) => {
        console.error('[useCrawlerEvents] Connection error:', error.message);
        console.error('[useCrawlerEvents] Error details:', error);
      });

      socketRef.current = socketInstance;
    });

    return () => {
      if (socketInstance) {
        // Unsubscribe from crawler events
        socketInstance.emit('unsubscribe_crawler', { projectId });
        socketInstance.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, projectId, handleCrawlerEvent]);

  // Check if crawler is active - use useMemo instead of useCallback
  const isActive = useMemo(() => {
    return crawlerStatus?.eventType === 'crawler.started' || 
           crawlerStatus?.eventType === 'crawler.progress' ||
           crawlerStatus?.eventType === 'crawler.page_crawled';
  }, [crawlerStatus]);

  // Get current progress - use useMemo instead of useCallback
  const progress = useMemo(() => {
    return crawlerStatus?.progress || 0;
  }, [crawlerStatus]);

  return {
    isConnected,
    crawlerStatus,
    isActive,
    progress,
  };
}