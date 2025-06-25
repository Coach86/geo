"use client";

import React, { useEffect, useState } from "react";
import { SvgLoader } from "@/components/ui/svg-loader";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  minLoadTime?: number; // Minimum time to show loader in ms
}

export function PageTransition({ 
  children, 
  loading = false, 
  className,
  minLoadTime = 300 // Minimum 300ms to prevent flashing
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

  return (
    <div className={cn("relative min-h-[400px]", className)}>
      {/* Loader overlay */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300 z-10",
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