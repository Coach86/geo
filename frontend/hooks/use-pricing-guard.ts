"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { getMyOrganization } from "@/lib/organization-api";

export function usePricingGuard() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      // Still loading auth - wait
      if (authLoading) {
        return;
      }

      // No token - redirect to login
      if (!token) {
        router.replace("/auth/login");
        return;
      }

      try {
        // Fetch organization data
        const org = await getMyOrganization(token);

        // If user has no projects yet, send to onboarding first
        if (org.currentProjects === 0) {
          router.replace("/onboarding");
          return;
        }

        // If user already has a paid plan and projects, go to profile
        if (org.stripePlanId && org.currentProjects && org.currentProjects > 0) {
          router.replace("/profile");
          return;
        }

        // User has projects but no paid plan - allow access to pricing
        setCanAccess(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        router.replace("/auth/login");
      }
    };

    checkAccess();
  }, [token, authLoading, router]);

  return { canAccess, isLoading };
}