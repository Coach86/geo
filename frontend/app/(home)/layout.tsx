"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { Skeleton } from "@/components/ui/skeleton";
import { NavigationProvider, useNavigation } from "@/providers/navigation-provider";
import { FeatureAccessProvider } from "@/providers/feature-access-provider";
import { Toaster } from "@/components/ui/toaster";
import { getUserProjects } from "@/lib/auth-api";
import { SvgLoader } from "@/components/ui/svg-loader";

function HomeLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token } = useAuth();
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const { setAllProjects } = useNavigation();

  useEffect(() => {
    const loadProjects = async () => {
      if (token) {
        setIsLoadingProjects(true);
        try {
          const projects = await getUserProjects(token);
          if (!projects || (Array.isArray(projects) && projects.length === 0)) {
            router.push("/onboarding");
            return;
          }
          setAllProjects(projects);
        } catch (error) {
          console.error("Failed to load projects:", error);
        } finally {
          setIsLoadingProjects(false);
        }
      }
    };

    loadProjects();
  }, [token, router, setAllProjects]);

  if (isLoadingProjects) {
    return (
      <div className="flex h-screen items-center justify-center">
        <SvgLoader className="text-gray-500" size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with logo */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-8 py-4">
          <img src="/logo-small.png" className="w-24" alt="Logo" />
        </div>
      </header>
      {/* Main content */}
      <main>{children}</main>
      <Toaster />
    </div>
  );
}

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authState, isLoading } = useAuthGuard({
    requirePayment: true,
    requireProjects: true,
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  if (authState === "authenticated") {
    return (
      <NavigationProvider>
        <FeatureAccessProvider>
          <HomeLayoutContent>{children}</HomeLayoutContent>
        </FeatureAccessProvider>
      </NavigationProvider>
    );
  }

  // Return null while redirecting
  return null;
}