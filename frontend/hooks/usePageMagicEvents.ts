import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface PageMagicEvent {
  jobId: string;
  projectId: string;
  pageUrl: string;
  eventType:
    | 'job_created'
    | 'iteration_started'
    | 'iteration_completed'
    | 'score_calculated'
    | 'improvement_generated'
    | 'job_completed'
    | 'job_failed'
    | 'rules_list_generated'
    | 'rule_fix_started'
    | 'rule_fix_completed'
    | 'rule_fix_failed'
    | 'rule_fix_retrying';
  iteration?: number;
  maxIterations?: number;
  message: string;
  timestamp: Date;
  progress?: number;
  scoreData?: {
    before: number;
    after: number;
    improvement: number;
  };
  error?: string;
  // New fields for rule-based processing
  rulesData?: any[];
  ruleData?: {
    rule: any;
    result?: {
      improvedContent?: string;
      improvedTitle?: string;
      improvedMetas?: any;
    };
    ruleIndex: number;
    totalRules: number;
    retryCount?: number;
    maxRetries?: number;
  };
}

interface UsePageMagicEventsOptions {
  jobId?: string;
  projectId?: string;
  onEvent?: (event: PageMagicEvent) => void;
}

export function usePageMagicEvents({
  jobId,
  projectId,
  onEvent,
  token,
}: UsePageMagicEventsOptions & { token?: string } = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<PageMagicEvent[]>([]);
  const [latestEvent, setLatestEvent] = useState<PageMagicEvent | null>(null);
  
  // Use refs to avoid recreating the effect when callbacks change
  const onEventRef = useRef(onEvent);
  const jobIdRef = useRef(jobId);
  const projectIdRef = useRef(projectId);

  // Update refs when props change
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    jobIdRef.current = jobId;
  }, [jobId]);

  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  useEffect(() => {
    if (!token) {
      console.log('[usePageMagicEvents] No token provided, skipping connection');
      return;
    }

    // Force cleanup of any existing socket first
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }

    let socketInstance: Socket | null = null;

    // Dynamic import to avoid SSR issues
    import('socket.io-client').then(({ io }) => {
      // Get server URL from environment or use localhost  
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const serverUrl = apiUrl.replace(/\/api\/?$/, '');
      
      console.log('[usePageMagicEvents] Connecting to page magic events:');
      console.log('  - Server URL:', serverUrl);
      console.log('  - Namespace:', '/page-magic-events');
      
      // Initialize socket connection
      socketInstance = io(`${serverUrl}/page-magic-events`, {
        path: '/api/socket-io/',
        auth: {
          token,
        },
        query: {
          token,
        },
        transports: ['websocket', 'polling'],
      });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('[usePageMagicEvents] ✅ Connected to Page Magic WebSocket');
      console.log('[usePageMagicEvents] Socket ID:', socketInstance?.id);
      console.log('[usePageMagicEvents] Connected:', socketInstance?.connected);
      setConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[usePageMagicEvents] ❌ Disconnected from Page Magic WebSocket');
      console.log('[usePageMagicEvents] Disconnect reason:', reason);
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[usePageMagicEvents] 🚨 Connection error:', error.message);
      console.error('[usePageMagicEvents] Error details:', error);
      
      // Log additional debugging info
      console.log('[usePageMagicEvents] Connection attempt to:', `${serverUrl}/page-magic-events`);
      console.log('[usePageMagicEvents] Socket path:', '/api/socket-io/');
      console.log('[usePageMagicEvents] Transports:', ['websocket', 'polling']);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('[usePageMagicEvents] 🔄 Reconnected after', attemptNumber, 'attempts');
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('[usePageMagicEvents] 🔄 Reconnection attempt #', attemptNumber);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('[usePageMagicEvents] 🚨 Reconnection error:', error.message);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('[usePageMagicEvents] ❌ Reconnection failed after all attempts');
    });

    // Event handler
    socketInstance.on('page_magic_event', (event: PageMagicEvent) => {
      // Filter events by jobId or projectId if specified
      if (jobIdRef.current && event.jobId !== jobIdRef.current) {
        return;
      }
      if (projectIdRef.current && event.projectId !== projectIdRef.current) {
        return;
      }

      // Update state
      setEvents(prev => [...prev, event]);
      setLatestEvent(event);
      
      // Call custom handler if provided
      if (onEventRef.current) {
        onEventRef.current(event);
      }
    });

      setSocket(socketInstance);
      
      console.log('[usePageMagicEvents] Socket instance created and configured');
      console.log('[usePageMagicEvents] Initial connection state:', socketInstance.connected);
    });

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
      }
    };
  }, [token, jobId]); // Re-connect when token OR jobId changes

  // Method to manually emit events (for testing)
  const emitEvent = useCallback(
    (eventType: string, data: any) => {
      if (socket && connected) {
        socket.emit(eventType, data);
      }
    },
    [socket, connected]
  );

  // Method to clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setLatestEvent(null);
  }, []);

  return {
    socket,
    connected,
    events,
    latestEvent,
    emitEvent,
    clearEvents,
  };
}