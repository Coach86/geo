"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
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

  // Handle report selection changes
  useEffect(() => {
    const selectedReport = getSelectedReport(projectId);
    if (onReportSelect && selectedReport) {
      onReportSelect(selectedReport);
    }
  }, [projectId, selectedReports[projectId]]); // Only depend on the specific project's selection

  const projectReports = reports[projectId] || [];
  const selectedReportId = selectedReports[projectId];
  const isLoading = loadingReports[projectId] || isInitializing;

  const handleReportChange = (reportId: string) => {
    selectReport(projectId, reportId);
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
      <SelectTrigger className={`w-[280px] ${className}`}>
        <SelectValue placeholder="Select a report">
          {selectedReportId && (
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span>
                {format(
                  new Date(
                    projectReports.find((r) => r.id === selectedReportId)
                      ?.generatedAt || ""
                  ),
                  "MMM d, yyyy 'at' h:mm a"
                )}
              </span>
            </div>
          )}
        </SelectValue>
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