"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { getProjectById, type ProjectResponse } from "@/lib/auth-api";
import type { ReportResponse } from "@/types/reports";

interface UseReportDataReturn<T extends ReportResponse = ReportResponse> {
  selectedProjectId: string | null;
  projectDetails: ProjectResponse | null;
  selectedReport: T | null;
  setSelectedReport: (report: T | null) => void;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to manage project and report data with persistence
 * @param processReport Optional function to process/transform report data
 */
export function useReportData<T extends ReportResponse = ReportResponse>(
  processReport?: (report: ReportResponse, projectDetails: ProjectResponse) => T
): UseReportDataReturn<T> {
  const { token } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectResponse | null>(null);
  const [selectedReport, setSelectedReport] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get selected project from localStorage and fetch details
  useEffect(() => {
    const fetchProjectDetails = async () => {
      const projectId = localStorage.getItem("selectedProjectId");

      if (!projectId || !token) {
        setSelectedProjectId(null);
        setProjectDetails(null);
        setLoading(false);
        return;
      }

      setSelectedProjectId(projectId);
      setLoading(true);
      setError(null);

      try {
        // Fetch project details
        const details = await getProjectById(projectId, token);
        setProjectDetails(details);
      } catch (err) {
        console.error("Failed to fetch project details:", err);
        setError("Failed to load project details");
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();

    // Listen for project selection changes
    const handleProjectChange = () => {
      fetchProjectDetails();
    };

    window.addEventListener("projectSelectionChanged", handleProjectChange);

    return () => {
      window.removeEventListener("projectSelectionChanged", handleProjectChange);
    };
  }, [token]);

  // Handle report selection
  const handleReportSelect = (report: ReportResponse | null) => {
    if (!report) {
      setSelectedReport(null);
      return;
    }

    // Process report if a processor function is provided
    const processedReport = processReport && projectDetails
      ? processReport(report, projectDetails)
      : report as T;

    setSelectedReport(processedReport);
  };

  return {
    selectedProjectId,
    projectDetails,
    selectedReport,
    setSelectedReport: handleReportSelect,
    loading,
    error,
  };
}