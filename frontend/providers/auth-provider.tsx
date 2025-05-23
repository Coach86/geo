"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { validateToken } from '@/lib/auth-api';

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

  const isAuthenticated = !!user;

  const login = async (token: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const validation = await validateToken(token);
      
      if (validation.valid && validation.userId) {
        const authUser: AuthUser = {
          id: validation.userId,
          email: '', // We'll get this from user profile if needed
          token,
        };
        
        setUser(authUser);
        
        // Store token in localStorage for persistence
        localStorage.setItem('authToken', token);
        localStorage.setItem('userId', validation.userId);
        
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
        const authUser: AuthUser = {
          id: validation.userId,
          email: '',
          token,
        };
        
        setUser(authUser);
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