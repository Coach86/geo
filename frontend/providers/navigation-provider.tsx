"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ProjectResponse } from "@/lib/auth-api";
import { projectMatchesDomain } from "@/utils/url-utils";
import { 
  saveSelectedDomain, 
  getSelectedDomain,
  saveSelectedProject,
  getSelectedProject 
} from "@/lib/navigation-persistence";

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
  const [selectedDomain, setSelectedDomainState] = useState<string | null>(() => getSelectedDomain());
  const [selectedProject, setSelectedProjectState] = useState<ProjectResponse | null>(null);
  const [allProjects, setAllProjects] = useState<ProjectResponse[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectResponse[]>([]);

  // Wrapper to persist domain selection
  const setSelectedDomain = (domain: string | null) => {
    setSelectedDomainState(domain);
    saveSelectedDomain(domain);
  };

  // Wrapper to persist project selection
  const setSelectedProject = (project: ProjectResponse | null) => {
    setSelectedProjectState(project);
    if (project) {
      saveSelectedProject(project.id);
      localStorage.setItem("selectedProjectId", project.id); // Keep backward compatibility
    } else {
      saveSelectedProject(null);
      localStorage.removeItem("selectedProjectId");
    }
    // Dispatch event for backward compatibility
    window.dispatchEvent(new Event("projectSelectionChanged"));
  };

  // Filter projects based on selected domain
  useEffect(() => {
    if (!selectedDomain) {
      setFilteredProjects(allProjects);
      return;
    }

    const filtered = allProjects.filter((project) => 
      projectMatchesDomain(project.url, selectedDomain)
    );

    setFilteredProjects(filtered);

    // Update selected project if it's not in filtered list
    if (selectedProject && !filtered.find(p => p.id === selectedProject.id)) {
      const newSelectedProject = filtered[0] || null;
      setSelectedProject(newSelectedProject);
    }
  }, [selectedDomain, allProjects, selectedProject]);

  // Load persisted project when projects are first loaded
  useEffect(() => {
    if (allProjects.length > 0 && !selectedProject) {
      const persistedProjectId = getSelectedProject();
      if (persistedProjectId) {
        const persistedProject = allProjects.find(p => p.id === persistedProjectId);
        if (persistedProject) {
          // Check if the persisted project matches the selected domain
          if (!selectedDomain || projectMatchesDomain(persistedProject.url, selectedDomain)) {
            setSelectedProject(persistedProject);
            return;
          }
        }
      }
      // If no valid persisted project, select first filtered project
      if (filteredProjects.length > 0) {
        setSelectedProject(filteredProjects[0]);
      }
    }
  }, [allProjects, filteredProjects, selectedProject, selectedDomain]);

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