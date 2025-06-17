"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/providers/auth-provider";
import { getMyOrganization } from "@/lib/organization-api";
import { usePlans } from "@/hooks/use-plans";

export type FeatureType = "visibility" | "sentiment" | "alignment" | "competition";

interface FeatureAccess {
  visibility: boolean;
  sentiment: boolean;
  alignment: boolean;
  competition: boolean;
  isFreePlan: boolean;
  planName: string | null;
  isLoading: boolean;
}

interface FeatureAccessContextType {
  featureAccess: FeatureAccess;
  refreshFeatureAccess: () => Promise<void>;
}

const FeatureAccessContext = createContext<FeatureAccessContextType | undefined>(undefined);

export function FeatureAccessProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { plans, loading: plansLoading } = usePlans();
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess>({
    visibility: false,
    sentiment: false,
    alignment: false,
    competition: false,
    isFreePlan: false,
    planName: null,
    isLoading: true,
  });
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const checkFeatureAccess = async (abortSignal?: AbortSignal) => {
    // Prevent multiple requests within 5 seconds
    const now = Date.now();
    if (now - lastFetchTime < 5000) {
      return;
    }

    // Wait for plans to load before checking
    if (plansLoading) {
      return;
    }

    if (!token) {
      setFeatureAccess({
        visibility: false,
        sentiment: false,
        alignment: false,
        competition: false,
        isFreePlan: false,
        planName: null,
        isLoading: false,
      });
      return;
    }

    // Prevent multiple simultaneous requests
    setFeatureAccess(prev => ({ ...prev, isLoading: true }));
    setLastFetchTime(now);

    try {
      // Check if request was aborted
      if (abortSignal?.aborted) {
        return;
      }

      const org = await getMyOrganization(token);
      
      // Check if user has a plan
      if (!org.stripePlanId) {
        // No plan assigned - treat as free plan
        setFeatureAccess({
          visibility: true,
          sentiment: false,
          alignment: false,
          competition: false,
          isFreePlan: true,
          planName: "Free",
          isLoading: false,
        });
        return;
      }

      // Find the plan details
      const userPlan = plans.find(plan => plan.id === org.stripePlanId);
      
      if (!userPlan) {
        // Plan not found, assume paid features
        setFeatureAccess({
          visibility: true,
          sentiment: true,
          alignment: true,
          competition: true,
          isFreePlan: false,
          planName: null,
          isLoading: false,
        });
        return;
      }

      // Check if it's a free plan
      const isFreePlan = 
        userPlan.metadata?.isFree === true || 
        userPlan.name.toLowerCase() === 'free' ||
        userPlan.stripeProductId === null ||
        userPlan.stripeProductId === '';

      setFeatureAccess({
        visibility: true, // Always available
        sentiment: !isFreePlan,
        alignment: !isFreePlan,
        competition: !isFreePlan,
        isFreePlan,
        planName: userPlan.name,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to check feature access:", error);
      setFeatureAccess({
        visibility: false,
        sentiment: false,
        alignment: false,
        competition: false,
        isFreePlan: false,
        planName: null,
        isLoading: false,
      });
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    checkFeatureAccess(abortController.signal);
    
    return () => {
      abortController.abort();
    };
  }, [token, plans, plansLoading]);

  return (
    <FeatureAccessContext.Provider value={{ 
      featureAccess, 
      refreshFeatureAccess: checkFeatureAccess 
    }}>
      {children}
    </FeatureAccessContext.Provider>
  );
}

export function useFeatureAccess(): FeatureAccess {
  const context = useContext(FeatureAccessContext);
  if (!context) {
    // Return default state if used outside provider (e.g., in non-protected routes)
    return {
      visibility: false,
      sentiment: false,
      alignment: false,
      competition: false,
      isFreePlan: false,
      planName: null,
      isLoading: false,
    };
  }
  return context.featureAccess;
}

export function useFeatureGate(feature: FeatureType) {
  const featureAccess = useFeatureAccess();

  return {
    hasAccess: featureAccess[feature],
    isLoading: featureAccess.isLoading,
    isFreePlan: featureAccess.isFreePlan,
    planName: featureAccess.planName,
  };
}