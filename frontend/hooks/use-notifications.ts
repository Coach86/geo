"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Socket } from 'socket.io-client';

export interface UserNotificationEvent {
  userId: string;
  projectId: string;
  projectName: string;
  reportId: string;
  eventType: 'report_completed';
  triggerType: 'manual' | 'cron' | 'new_project';
  message: string;
  timestamp: Date;
}

interface UseNotificationsOptions {
  userId?: string;
  token?: string;
  onNotification?: (notification: UserNotificationEvent) => void;
}

export function useNotifications({ userId, token, onNotification }: UseNotificationsOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<UserNotificationEvent[]>([]);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const onNotificationRef = useRef(onNotification);
  const router = useRouter();

  // Update the ref when onNotification changes
  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  // Initialize notification sound
  useEffect(() => {
    notificationSoundRef.current = new Audio('/notification.mp3');
    notificationSoundRef.current.volume = 0.5;
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: UserNotificationEvent) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = 'Analysis Complete';
      const body = notification.message;
      const icon = '/favicon.svg';

      const browserNotification = new Notification(title, {
        body,
        icon,
        badge: '/logo-small.png',
        tag: notification.reportId,
        requireInteraction: false,
        silent: false,
      });

      // Handle click on notification
      browserNotification.onclick = () => {
        window.focus();
        router.push(`/explorer?projectId=${notification.projectId}`);
        browserNotification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }, [router]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (notificationSoundRef.current) {
      notificationSoundRef.current.play().catch(err => {
        console.warn('Failed to play notification sound:', err);
      });
    }
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    console.log('[useNotifications] Initializing with token:', token ? 'present' : 'missing', 'userId:', userId);

    if (!token || !userId) {
      console.log('[useNotifications] Missing token or userId, skipping connection');
      return;
    }

    let socketInstance: Socket | null = null;

    // Dynamic import to avoid SSR issues
    import('socket.io-client').then(({ io }) => {
      // Handle incoming notification - moved inside to have access to all dependencies
      const handleNotification = (notification: UserNotificationEvent) => {
        console.log('[useNotifications] Processing notification:', notification);

        // Add to notifications list
        setNotifications(prev => [notification, ...prev]);

        // Show toast notification
        toast.success(notification.message, {
          description: `Your ${notification.triggerType === 'manual' ? 'manual' : notification.triggerType === 'cron' ? 'scheduled' : 'initial'} analysis is ready`,
          action: {
            label: 'View Report',
            onClick: () => {
              router.push(`/explorer?projectId=${notification.projectId}`);
            },
          },
          duration: 10000,
        });

        // Show browser notification
        showBrowserNotification(notification);

        // Play sound
        playNotificationSound();

        // Call custom handler if provided
        if (onNotificationRef.current) {
          onNotificationRef.current(notification);
        }
      };

      // Socket.IO Configuration - Fixed version
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      
      // Remove /api suffix if present since Socket.IO connects to the base server
      const serverUrl = apiUrl.replace(/\/api\/?$/, '');
      
      console.log('[useNotifications] Socket.IO Connection:');
      console.log('  - Original API URL:', apiUrl);
      console.log('  - Server URL:', serverUrl);
      console.log('  - Full connection URL:', `${serverUrl}/user-notifications`);
      console.log('  - Path:', '/api/socket-io/');

      // Connect to namespace - the URL should be server:port/namespace
      socketInstance = io(`${serverUrl}/user-notifications`, {
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
        console.log('[useNotifications] Connected to notification service');
        setIsConnected(true);

        // Request notification permission when connected
        requestNotificationPermission().then(granted => {
          console.log('[useNotifications] Notification permission:', granted ? 'granted' : 'denied');
        });
      });

      socketInstance.on('disconnect', () => {
        console.log('[useNotifications] Disconnected from notification service');
        setIsConnected(false);
      });

      socketInstance.on('connected', (data) => {
        console.log('[useNotifications] Connected confirmation:', data);
      });

      socketInstance.on('notification', (data) => {
        console.log('[useNotifications] Raw notification received:', data);
        handleNotification(data);
      });

      socketInstance.on('connect_error', (error: any) => {
        console.error('[useNotifications] Connection error:', error.message);
        console.error('[useNotifications] Error type:', error.type);
        console.error('[useNotifications] Error details:', error);
        
        // Common error explanations
        if (error.message.includes('Invalid namespace')) {
          console.error('[useNotifications] The namespace "/user-notifications" was not found on the server.');
          console.error('Make sure the backend UserNotificationsGateway is properly registered.');
        } else if (error.message.includes('CORS')) {
          console.error('[useNotifications] CORS error - check server CORS configuration.');
        } else if (error.message.includes('xhr poll error')) {
          console.error('[useNotifications] Cannot reach the server - is the backend running?');
        }
      });

      // Additional debugging events
      socketInstance.io.on('error', (error) => {
        console.error('[useNotifications] Transport error:', error);
      });

      socketInstance.io.on('reconnect_attempt', (attempt) => {
        console.log('[useNotifications] Reconnection attempt:', attempt);
      });

      socketInstance.io.on('reconnect', (attempt) => {
        console.log('[useNotifications] Reconnected after', attempt, 'attempts');
      });

      socketRef.current = socketInstance;
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, userId, showBrowserNotification, playNotificationSound, router]); // Removed onNotification from deps

  // Subscribe to specific project notifications
  const subscribeToProject = useCallback((projectId: string) => {
    if (socketRef.current && isConnected) {
      console.log('[useNotifications] Subscribing to project:', projectId);
      socketRef.current.emit('subscribe_project', { projectId });
    }
  }, [isConnected]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    isConnected,
    notifications,
    subscribeToProject,
    clearNotifications,
    requestNotificationPermission,
  };
}
