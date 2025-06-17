"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { getMyOrganization } from "@/lib/organization-api";

export type AuthState = "loading" | "unauthenticated" | "no-payment" | "no-projects" | "authenticated";

interface UseAuthGuardOptions {
  requirePayment?: boolean;
  requireProjects?: boolean;
  redirectTo?: string;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [organization, setOrganization] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Still loading auth - wait
      if (authLoading) {
        setAuthState("loading");
        return;
      }

      // No token - redirect to login
      if (!token) {
        setAuthState("unauthenticated");
        router.replace("/auth/login");
        return;
      }

      try {
        // Fetch organization data
        const org = await getMyOrganization(token);
        setOrganization(org);

        // Check projects first - new users should onboard before seeing pricing
        if (org.currentProjects === 0 && options.requireProjects !== false) {
          setAuthState("no-projects");
          router.replace("/onboarding");
          return;
        }

        // Check payment status is no longer required for free plan users
        // Free plan users can access the app with visibility feature only

        // All checks passed
        setAuthState("authenticated");
      } catch (error) {
        console.error("Auth check failed:", error);
        setAuthState("unauthenticated");
        router.replace("/auth/login");
      }
    };

    checkAuth();
  }, [token, authLoading, router, options.requirePayment, options.requireProjects]);

  return { authState, organization, isLoading: authState === "loading" };
}