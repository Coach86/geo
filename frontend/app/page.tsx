"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { getMyOrganization } from "@/lib/organization-api";

export default function RootPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      if (!token) {
        router.replace("/auth/login");
        return;
      }

      try {
        // Get organization data to check plan and projects
        const organization = await getMyOrganization(token);
        
        // Check if user has any projects first
        if (organization.currentProjects === 0) {
          router.replace("/onboarding");
          return;
        }

        // User has projects, check if they have an active plan
        const hasActivePlan = organization.stripePlanId || organization.hasActivatedFreePlan;
        
        if (!hasActivePlan) {
          // User has projects but no plan - redirect to pricing
          router.replace("/pricing");
          return;
        }

        // User has projects and a plan, redirect to home
        router.replace("/home");
      } catch (error) {
        console.error("Failed to fetch organization:", error);
        router.replace("/auth/login");
      }
    };

    checkAuthAndRedirect();
  }, [router, token, pathname]);

  // Show nothing while checking
  return null;
}