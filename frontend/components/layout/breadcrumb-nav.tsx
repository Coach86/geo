"use client";

import { ChevronRight } from "lucide-react";
import { ProjectResponse } from "@/lib/auth-api";
import { ReportSelector } from "@/components/shared/ReportSelector";

interface BreadcrumbNavProps {
  projects?: ProjectResponse[];
  selectedProject: ProjectResponse | null;
  onProjectSelect?: (project: ProjectResponse) => void;
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
      {/* Current Page */}
      <span className="font-semibold text-gray-900 flex-shrink-0">{currentPage}</span>

      {/* Report Selector (if applicable) */}
      {showReportSelector && token && selectedProject && (
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