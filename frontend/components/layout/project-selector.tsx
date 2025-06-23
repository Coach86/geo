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
import { Favicon } from "@/components/ui/favicon"

interface ProjectSelectorProps {
  projects: ProjectResponse[]
  selectedProject: ProjectResponse | null
  onProjectSelect: (project: ProjectResponse) => void
  variant?: 'project' | 'global'
}

export default function ProjectSelector({
  projects,
  selectedProject,
  onProjectSelect,
  variant = 'project',
}: ProjectSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  // In global mode, we show "Select project" but still track the selection
  const displayedProject = variant === 'global' ? null : selectedProject

  if (projects.length === 0) {
    return null
  }

  return (
    <div className="px-4 py-4 border-b">
      <Select 
        value={displayedProject?.id || ""} 
        onValueChange={(projectId) => {
          const project = projects.find(p => p.id === projectId)
          if (project) {
            onProjectSelect(project)
            // Always redirect to visibility when selecting a project in global mode
            if (variant === 'global') {
              router.push('/visibility')
            }
          }
        }}
      >
        <SelectTrigger className="w-full h-14 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 border-0 shadow-sm [&>svg]:hidden">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                {displayedProject ? (
                  <Favicon 
                    src={displayedProject.favicon}
                    alt={`${displayedProject.brandName} favicon`}
                    className="w-5 h-5"
                    fallbackClassName="w-5 h-5 text-gray-600"
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-xs text-gray-500 font-medium">Project</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {displayedProject ? (displayedProject.name || displayedProject.brandName) : "Select project"}
                </p>
              </div>
            </div>
            <ArrowRightLeft className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
          </div>
        </SelectTrigger>
        <SelectContent className="max-w-[250px]">
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id} className="cursor-pointer">
              <div className="flex items-center gap-2 py-1">
                <Favicon 
                  src={project.favicon}
                  alt={`${project.brandName} favicon`}
                  className="w-4 h-4"
                  fallbackClassName="w-4 h-4 text-gray-500"
                />
                <span className="truncate text-sm">{project.name || project.brandName}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}