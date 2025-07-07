"use client";

import { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { useAuth } from "@/providers/auth-provider";

interface FeatureFlags {
  'page-intelligence': boolean;
  'page-magic': boolean;
}

export function usePostHogFlags() {
  const posthog = usePostHog();
  const { user, isAuthenticated } = useAuth();
  const [flags, setFlags] = useState<FeatureFlags>({
    'page-intelligence': false,
    'page-magic': false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In development mode, enable all features by default
    if (process.env.NODE_ENV === 'development') {
      setFlags({
        'page-intelligence': true,
        'page-magic': true,
      });
      setIsLoading(false);
      return;
    }

    if (!posthog || !isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    // Set person properties for flag evaluation
    posthog.setPersonPropertiesForFlags({
      email: user.email,
    });

    // Wait for feature flags to be loaded
    posthog.onFeatureFlags(() => {
      setFlags({
        'page-intelligence': posthog.isFeatureEnabled('page-intelligence') || false,
        'page-magic': posthog.isFeatureEnabled('page-magic') || false,
      });
      setIsLoading(false);
    });

    // Also check flags immediately in case they're already loaded
    const checkFlags = () => {
      setFlags({
        'page-intelligence': posthog.isFeatureEnabled('page-intelligence') || false,
        'page-magic': posthog.isFeatureEnabled('page-magic') || false,
      });
      setIsLoading(false);
    };

    // Small delay to ensure PostHog has initialized
    const timer = setTimeout(checkFlags, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [posthog, isAuthenticated, user]);

  return {
    flags,
    isLoading,
    isFeatureEnabled: (flag: keyof FeatureFlags) => flags[flag],
  };
}