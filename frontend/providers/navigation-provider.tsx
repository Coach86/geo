"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ProjectResponse } from "@/lib/auth-api";
import { 
  saveSelectedProject,
  getSelectedProject 
} from "@/lib/navigation-persistence";

interface NavigationContextType {
  selectedProject: ProjectResponse | null;
  setSelectedProject: (project: ProjectResponse | null) => void;
  allProjects: ProjectResponse[];
  setAllProjects: (projects: ProjectResponse[]) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [selectedProject, setSelectedProjectState] = useState<ProjectResponse | null>(null);
  const [allProjects, setAllProjects] = useState<ProjectResponse[]>([]);

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


  // Load persisted project when projects are first loaded
  useEffect(() => {
    if (allProjects.length > 0 && !selectedProject) {
      const persistedProjectId = getSelectedProject();
      if (persistedProjectId) {
        const persistedProject = allProjects.find(p => p.id === persistedProjectId);
        if (persistedProject) {
          setSelectedProject(persistedProject);
          return;
        }
      }
      // If no valid persisted project, select first project
      if (allProjects.length > 0) {
        setSelectedProject(allProjects[0]);
      }
    }
  }, [allProjects, selectedProject]);

  return (
    <NavigationContext.Provider
      value={{
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