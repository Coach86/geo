"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { api } from '@/lib/api';

interface NotificationContextType {
  isConnected: boolean;
  notifications: any[];
  subscribeToProject: (projectId: string) => void;
  clearNotifications: () => void;
  requestNotificationPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  
  console.log('[NotificationProvider] Initializing with token:', token ? 'present' : 'missing', 'userId:', userId);
  
  const notificationHooks = useNotifications({ 
    userId: userId || undefined, 
    token: token || undefined,
    onNotification: (notification) => {
      // Additional logic when notification is received
      console.log('[NotificationProvider] Notification received:', notification);
      
      // Refresh report data if we're on a report page
      if (window.location.pathname.includes('/explorer') || 
          window.location.pathname.includes('/visibility') ||
          window.location.pathname.includes('/sentiment') ||
          window.location.pathname.includes('/alignment') ||
          window.location.pathname.includes('/competition')) {
        // Trigger a refresh of the report data
        window.dispatchEvent(new CustomEvent('report-updated', { 
          detail: { projectId: notification.projectId } 
        }));
      }
    }
  });

  return (
    <NotificationContext.Provider value={notificationHooks}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}