"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ProjectResponse } from "@/lib/auth-api";

interface NavigationContextType {
  selectedDomain: string | null;
  setSelectedDomain: (domain: string | null) => void;
  filteredProjects: ProjectResponse[];
  selectedProject: ProjectResponse | null;
  setSelectedProject: (project: ProjectResponse | null) => void;
  allProjects: ProjectResponse[];
  setAllProjects: (projects: ProjectResponse[]) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null);
  const [allProjects, setAllProjects] = useState<ProjectResponse[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectResponse[]>([]);

  // Filter projects based on selected domain
  useEffect(() => {
    if (!selectedDomain) {
      setFilteredProjects(allProjects);
      return;
    }

    const filtered = allProjects.filter((project) => {
      if (!project.url) return false;
      try {
        const url = new URL(project.url);
        return url.hostname === selectedDomain;
      } catch {
        return false;
      }
    });

    setFilteredProjects(filtered);

    // Update selected project if it's not in filtered list
    if (selectedProject && !filtered.find(p => p.id === selectedProject.id)) {
      setSelectedProject(filtered[0] || null);
    }
  }, [selectedDomain, allProjects, selectedProject]);

  return (
    <NavigationContext.Provider
      value={{
        selectedDomain,
        setSelectedDomain,
        filteredProjects,
        selectedProject,
        setSelectedProject,
        allProjects,
        setAllProjects,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}