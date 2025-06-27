"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { PageTransition } from "@/components/shared/PageTransition";

interface PageTransitionContextType {
  startTransition: () => void;
  endTransition: () => void;
  isTransitioning: boolean;
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTransition = useCallback(() => {
    setIsTransitioning(true);
  }, []);

  const endTransition = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  return (
    <PageTransitionContext.Provider value={{ startTransition, endTransition, isTransitioning }}>
      {isTransitioning && (
        <PageTransition loading={true} className="fixed inset-0 z-50">
          <div />
        </PageTransition>
      )}
      {children}
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error("usePageTransition must be used within a PageTransitionProvider");
  }
  return context;
}