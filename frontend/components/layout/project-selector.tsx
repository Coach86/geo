"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, ArrowRightLeft } from "lucide-react"
import { ProjectResponse } from "@/lib/auth-api"
import { useFavicon } from "@/hooks/use-favicon"

interface ProjectSelectorProps {
  projects: ProjectResponse[]
  selectedProject: ProjectResponse | null
  onProjectSelect: (project: ProjectResponse) => void
}


// Component to handle favicon for each project
function ProjectOption({ project, children }: { project: ProjectResponse; children: React.ReactNode }) {
  const { faviconUrl } = useFavicon(project.url)
  
  return (
    <div className="flex items-center gap-2">
      {faviconUrl && (
        <img 
          src={faviconUrl}
          alt={`${project.brandName} favicon`}
          className="w-4 h-4"
        />
      )}
      {children}
    </div>
  )
}

export default function ProjectSelector({
  projects,
  selectedProject,
  onProjectSelect,
}: ProjectSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Get favicon for selected project
  const { faviconUrl: selectedFavicon } = useFavicon(selectedProject?.url || '')

  if (projects.length === 0) {
    return null
  }

  return (
    <div className="px-4 py-4 border-b">
      <Select 
        value={selectedProject?.id || ""} 
        onValueChange={(projectId) => {
          const project = projects.find(p => p.id === projectId)
          if (project) {
            onProjectSelect(project)
          }
        }}
      >
        <SelectTrigger className="w-full h-14 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 border-0 shadow-sm [&>svg]:hidden">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                {selectedProject && selectedFavicon ? (
                  <img 
                    src={selectedFavicon}
                    alt={`${selectedProject.brandName} favicon`}
                    className="w-5 h-5"
                  />
                ) : selectedProject ? (
                  <Building2 className="w-5 h-5 text-gray-600" />
                ) : (
                  <Building2 className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-xs text-gray-500 font-medium">Project</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {selectedProject ? (selectedProject.name || selectedProject.brandName) : "Select project"}
                </p>
              </div>
            </div>
            <ArrowRightLeft className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
          </div>
        </SelectTrigger>
        <SelectContent className="max-w-[250px]">
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id} className="cursor-pointer">
              <ProjectOption project={project}>
                <span className="truncate">{project.name || project.brandName}</span>
              </ProjectOption>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}