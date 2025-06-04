"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import type { ReportResponse } from "@/types/reports";
import { Skeleton } from "@/components/ui/skeleton";
import { useReports } from "@/providers/report-provider";

interface ReportSelectorProps {
  projectId: string;
  token: string;
  onReportSelect?: (report: ReportResponse | null) => void;
  className?: string;
}

export function ReportSelector({
  projectId,
  token,
  onReportSelect,
  className = "",
}: ReportSelectorProps) {
  const { reports, selectedReports, loadingReports, fetchReports, selectReport, getSelectedReport } = useReports();
  const [isInitializing, setIsInitializing] = useState(true);

  // Fetch reports when component mounts or projectId changes
  useEffect(() => {
    if (projectId && token) {
      fetchReports(projectId, token).finally(() => {
        setIsInitializing(false);
      });
    }
  }, [projectId, token, fetchReports]);

  // Notify parent component of initial selection only
  useEffect(() => {
    if (onReportSelect && !isInitializing) {
      const selectedReport = getSelectedReport(projectId);
      if (selectedReport) {
        onReportSelect(selectedReport);
      }
    }
  }, [isInitializing]); // Only run after initialization

  const projectReports = reports[projectId] || [];
  const selectedReportId = selectedReports[projectId];
  const isLoading = loadingReports[projectId] || isInitializing;

  const handleReportChange = (reportId: string) => {
    selectReport(projectId, reportId);
    
    // Notify parent of the change if callback is provided
    if (onReportSelect) {
      const newReport = projectReports.find(r => r.id === reportId);
      if (newReport) {
        onReportSelect(newReport);
      }
    }
  };

  if (isLoading) {
    return <Skeleton className="h-10 w-[280px]" />;
  }

  if (!projectReports.length) {
    return (
      <div className="text-sm text-gray-500 px-3 py-2 border rounded-md bg-gray-50">
        No reports available
      </div>
    );
  }

  return (
    <Select value={selectedReportId} onValueChange={handleReportChange}>
      <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-gray-100 rounded-md transition-colors [&>svg]:hidden w-auto">
        <div className="flex items-center gap-1 px-2 py-1">
          <CalendarIcon className="h-3 w-3 text-gray-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate" style={{ maxWidth: '200px' }}>
            {selectedReportId
              ? format(
                  new Date(
                    projectReports.find((r) => r.id === selectedReportId)
                      ?.generatedAt || ""
                  ),
                  "MMM d, yyyy"
                )
              : "Select report"}
          </span>
          <ChevronDown className="h-3 w-3 text-gray-900 flex-shrink-0" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {projectReports.map((report) => (
          <SelectItem key={report.id} value={report.id}>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span>
                {format(
                  new Date(report.generatedAt),
                  "MMM d, yyyy 'at' h:mm a"
                )}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}