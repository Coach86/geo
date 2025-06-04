"use client";

import { ChevronRight, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectResponse } from "@/lib/auth-api";
import { ReportSelector } from "@/components/shared/ReportSelector";

interface BreadcrumbNavProps {
  projects: ProjectResponse[];
  selectedProject: ProjectResponse | null;
  onProjectSelect: (project: ProjectResponse) => void;
  currentPage: string;
  showReportSelector?: boolean;
  token?: string;
  onReportSelect?: (report: any) => void;
}

export default function BreadcrumbNav({
  projects,
  selectedProject,
  onProjectSelect,
  currentPage,
  showReportSelector = false,
  token,
  onReportSelect,
}: BreadcrumbNavProps) {
  return (
    <nav className="inline-flex items-center gap-2 text-sm bg-gray-50/50 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50">
      {/* Current Page - First */}
      <span className="font-semibold text-gray-900 flex-shrink-0">{currentPage}</span>

      {/* Separator */}
      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />

      {/* Project Selector */}
      <div className="flex-shrink-0">
        <Select
          value={selectedProject?.id || ""}
          onValueChange={(value) => {
            const project = projects.find((p) => p.id === value);
            if (project) onProjectSelect(project);
          }}
        >
          <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-gray-100 rounded-md transition-colors [&>svg]:hidden w-auto">
            <div className="flex items-center gap-1 px-2 py-1">
              <span className="text-sm font-medium text-gray-700 truncate" style={{ maxWidth: '200px' }}>
                {selectedProject?.name || selectedProject?.brandName || "Select project"}
              </span>
              <ChevronDown className="h-3 w-3 text-gray-900 flex-shrink-0" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <span className="truncate">
                  {project.name || project.brandName}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Report Selector (if applicable) */}
      {showReportSelector && token && selectedProject && onReportSelect && (
        <>
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="flex-shrink-0">
            <ReportSelector
              token={token}
              projectId={selectedProject.id}
              onReportSelect={onReportSelect}
              className="report-selector-trigger"
            />
          </div>
        </>
      )}
    </nav>
  );
}