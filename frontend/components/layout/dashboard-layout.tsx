"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import Sidebar from "./sidebar";
import { getUserProjects, ProjectResponse } from "@/lib/auth-api";
import { SvgLoader } from "@/components/ui/svg-loader";
import { NavigationProvider, useNavigation } from "@/providers/navigation-provider";
import { Toaster } from "@/components/ui/sonner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isAuthenticated,
    isLoading: authLoading,
    token,
    checkAuth,
  } = useAuth();
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const {
    allProjects,
    setAllProjects,
    selectedProject,
    setSelectedProject,
  } = useNavigation();

  useEffect(() => {
    const verifyAndLoadData = async () => {
      if (!authLoading) {
        if (!isAuthenticated) {
          const isValid = await checkAuth();
          if (!isValid) {
            router.push("/auth/login");
            return;
          }
        }

        if (token) {
          setIsLoadingCards(true);
          try {
            const cards = await getUserProjects(token);
            if (
              !cards ||
              (Array.isArray(cards) && (cards as unknown[]).length === 0)
            ) {
              router.push("/onboarding");
              return null;
            }
            setAllProjects(cards);
            // The NavigationProvider will handle loading persisted project
          } catch (error) {
            console.error("Failed to load identity cards:", error);
          } finally {
            setIsLoadingCards(false);
          }
        }
      }
    };

    verifyAndLoadData();
  }, [authLoading, isAuthenticated, token, router, checkAuth]);

  // The NavigationProvider handles project selection persistence

  const handleProjectSelect = (project: ProjectResponse) => {
    setSelectedProject(project);
  };

  if (authLoading || isLoadingCards) {
    return (
      <div className="flex h-screen items-center justify-center">
        <SvgLoader className="text-gray-500" size="md" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        identityCards={allProjects}
        selectedProject={selectedProject}
        onProjectSelect={handleProjectSelect}
      />
      <main className="flex-1 overflow-y-auto ml-60">
        <div className="p-8">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <NavigationProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </NavigationProvider>
  );
}
