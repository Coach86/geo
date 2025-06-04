"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import Sidebar from "./sidebar";
import { getUserProjects, ProjectResponse } from "@/lib/auth-api";
import { Loader2 } from "lucide-react";
import { NavigationProvider, useNavigation } from "@/providers/navigation-provider";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const router = useRouter();
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

            // Check if there's a previously selected project in localStorage
            const savedProjectId = localStorage.getItem("selectedProjectId");
            const savedProject = cards.find(
              (card) => card.id === savedProjectId
            );

            if (savedProject) {
              setSelectedProject(savedProject);
            } else if (cards.length > 0 && !selectedProject) {
              setSelectedProject(cards[0]);
              localStorage.setItem("selectedProjectId", cards[0].id);
            }
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

  const handleProjectSelect = (project: ProjectResponse) => {
    setSelectedProject(project);
    localStorage.setItem("selectedProjectId", project.id);
    window.dispatchEvent(new Event("projectSelectionChanged"));
  };

  if (authLoading || isLoadingCards) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
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
