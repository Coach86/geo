"use client";

import React, { useEffect, useState } from "react";
import { SvgLoader } from "@/components/ui/svg-loader";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  minLoadTime?: number; // Minimum time to show loader in ms
  fullScreen?: boolean; // Whether to use fixed positioning for full screen overlay
}

export function PageTransition({ 
  children, 
  loading = false, 
  className,
  minLoadTime = 300, // Minimum 300ms to prevent flashing
  fullScreen = false // Default to page-level positioning
}: PageTransitionProps) {
  const [showLoader, setShowLoader] = useState(loading);
  const [contentReady, setContentReady] = useState(!loading);

  useEffect(() => {
    if (loading) {
      setShowLoader(true);
      setContentReady(false);
    } else {
      // Ensure loader shows for minimum time to prevent flashing
      const timer = setTimeout(() => {
        setShowLoader(false);
        setTimeout(() => setContentReady(true), 150); // Small delay for fade transition
      }, minLoadTime);
      
      return () => clearTimeout(timer);
    }
  }, [loading, minLoadTime]);

  if (fullScreen) {
    // Full screen overlay mode (used by global provider)
    return (
      <>
        {/* Full screen loader overlay */}
        <div
          className={cn(
            "fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300 z-50",
            showLoader ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <SvgLoader size="xl" />
        </div>
        {children}
      </>
    );
  }

  // Page-level transition mode (default)
  return (
    <div className={cn("relative min-h-[400px]", className)}>
      {/* Loader overlay - positioned relative to main content area for consistent placement */}
      <div
        className={cn(
          "fixed top-0 bottom-0 left-60 right-0 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300 z-40",
          showLoader ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <SvgLoader size="xl" />
      </div>

      {/* Content */}
      <div
        className={cn(
          "transition-opacity duration-300",
          contentReady ? "opacity-100" : "opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Hook for managing page transitions
export function usePageTransition(initialLoading = true) {
  const [isLoading, setIsLoading] = useState(initialLoading);

  const startTransition = () => setIsLoading(true);
  const endTransition = () => setIsLoading(false);

  return {
    isLoading,
    startTransition,
    endTransition,
  };
}