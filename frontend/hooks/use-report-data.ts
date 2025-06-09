"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/providers/auth-provider";
import { getProjectById, type ProjectResponse } from "@/lib/auth-api";
import type { ReportResponse } from "@/types/reports";
import { useReports } from "@/providers/report-provider";

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
  const { getSelectedReport, fetchReports, reports, loadingReports } = useReports();
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
        setSelectedReport(null);
        setLoading(false);
        return;
      }

      // Clear previous report immediately when project changes
      if (projectId !== selectedProjectId) {
        setSelectedReport(null);
      }

      setSelectedProjectId(projectId);
      setLoading(true);
      setError(null);

      try {
        // Fetch project details
        const details = await getProjectById(projectId, token);
        setProjectDetails(details);
        
        // Fetch reports for this project
        await fetchReports(projectId, token);
        
        // Set loading to false after successful fetch
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch project details:", err);
        setError("Failed to load project details");
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
  }, [token, fetchReports]);

  // Memoize the report update function
  const updateSelectedReport = useCallback(() => {
    if (!selectedProjectId || !projectDetails) return;
    
    const report = getSelectedReport(selectedProjectId);
    if (report) {
      const processedReport = processReport
        ? processReport(report, projectDetails)
        : report as T;
      setSelectedReport(processedReport);
    } else {
      setSelectedReport(null);
    }
  }, [selectedProjectId, projectDetails?.id, getSelectedReport]);

  // Update report when dependencies change
  useEffect(() => {
    updateSelectedReport();
  }, [updateSelectedReport]);

  // Listen for report selection changes
  useEffect(() => {
    window.addEventListener("reportSelectionChanged", updateSelectedReport);
    return () => {
      window.removeEventListener("reportSelectionChanged", updateSelectedReport);
    };
  }, [updateSelectedReport]);

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