"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { validateToken, getUserProfile } from '@/lib/auth-api';
import { clearAllSelectedReportIds } from '@/lib/report-selection';
import { clearNavigationPersistence } from '@/lib/navigation-persistence';
import { usePostHog } from 'posthog-js/react';

interface AuthUser {
  id: string;
  email: string;
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const posthog = usePostHog();

  const isAuthenticated = !!user;

  const login = async (token: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const validation = await validateToken(token);
      
      if (validation.valid && validation.userId) {
        // Fetch user profile to get email
        try {
          const profile = await getUserProfile(token);
          
          const authUser: AuthUser = {
            id: validation.userId,
            email: profile.email || '',
            token,
          };
          
          setUser(authUser);
          
          // Identify user in PostHog
          if (posthog) {
            posthog.identify(validation.userId, {
              email: profile.email,
            });
          }
          
          // Store token in localStorage for persistence
          localStorage.setItem('authToken', token);
          localStorage.setItem('userId', validation.userId);
          
          // Clear all report selections on login to ensure fresh data
          clearAllSelectedReportIds();
        } catch (profileError) {
          console.error('Failed to fetch user profile:', profileError);
          // Continue with login even if profile fetch fails
          const authUser: AuthUser = {
            id: validation.userId,
            email: '',
            token,
          };
          
          setUser(authUser);
          
          // Still identify in PostHog with just the user ID
          if (posthog) {
            posthog.identify(validation.userId);
          }
          
          localStorage.setItem('authToken', token);
          localStorage.setItem('userId', validation.userId);
          clearAllSelectedReportIds();
        }
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('pendingUserId');
    
    // Clear navigation persistence
    clearNavigationPersistence();
    
    // Reset PostHog identity
    if (posthog) {
      posthog.reset();
    }
  };

  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setIsLoading(false);
        return false;
      }

      const validation = await validateToken(token);
      
      if (validation.valid && validation.userId) {
        // Try to fetch user profile
        try {
          const profile = await getUserProfile(token);
          
          const authUser: AuthUser = {
            id: validation.userId,
            email: profile.email || '',
            token,
          };
          
          setUser(authUser);
          
          // Identify user in PostHog
          if (posthog) {
            posthog.identify(validation.userId, {
              email: profile.email,
            });
          }
        } catch (profileError) {
          console.error('Failed to fetch user profile during auth check:', profileError);
          // Continue without email if profile fetch fails
          const authUser: AuthUser = {
            id: validation.userId,
            email: '',
            token,
          };
          
          setUser(authUser);
          
          // Still identify in PostHog with just the user ID
          if (posthog) {
            posthog.identify(validation.userId);
          }
        }
        
        return true;
      } else {
        // Token is invalid, clear storage
        logout();
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication on mount, but not if we're on auth pages
  useEffect(() => {
    // Don't auto-check auth if we're on an auth page - let the page handle it
    if (typeof window !== 'undefined' && 
        (window.location.pathname.startsWith('/auth/login') || 
         window.location.pathname.startsWith('/auth/verify'))) {
      setIsLoading(false);
      return;
    }
    
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    token: user?.token || null,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}