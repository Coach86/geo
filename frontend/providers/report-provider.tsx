"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getProjectReports } from "@/lib/auth-api";
import { saveSelectedReportId, getSelectedReportId } from "@/lib/report-selection";
import type { ReportResponse } from "@/types/reports";

interface ReportContextValue {
  reports: Record<string, ReportResponse[]>; // Keyed by projectId
  selectedReports: Record<string, string>; // projectId -> reportId
  loadingReports: Record<string, boolean>;
  fetchReports: (projectId: string, token: string) => Promise<void>;
  selectReport: (projectId: string, reportId: string) => void;
  getSelectedReport: (projectId: string) => ReportResponse | null;
}

const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<Record<string, ReportResponse[]>>({});
  const [selectedReports, setSelectedReports] = useState<Record<string, string>>({});
  const [loadingReports, setLoadingReports] = useState<Record<string, boolean>>({});
  const loadingRef = useRef<Record<string, boolean>>({});

  // Fetch reports for a project
  const fetchReports = useCallback(async (projectId: string, token: string) => {
    if (!projectId || !token) return;

    // Skip if already loading
    if (loadingRef.current[projectId]) return;

    loadingRef.current = { ...loadingRef.current, [projectId]: true };
    setLoadingReports(prev => ({ ...prev, [projectId]: true }));

    try {
      const apiReports = await getProjectReports(projectId, token);
      
      // Sort reports by date (most recent first)
      const sortedReports = [...apiReports].sort(
        (a, b) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      );

      setReports(prev => ({ ...prev, [projectId]: sortedReports }));

      // Check if there's a saved selection
      const savedReportId = getSelectedReportId(projectId);
      const savedReport = savedReportId 
        ? sortedReports.find(r => r.id === savedReportId)
        : null;

      // Use saved report if it exists, otherwise use the most recent
      const reportToSelect = savedReport || sortedReports[0];
      if (reportToSelect) {
        setSelectedReports(prev => ({ ...prev, [projectId]: reportToSelect.id }));
        
        // Save if it wasn't already saved
        if (!savedReport) {
          saveSelectedReportId(projectId, reportToSelect.id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      loadingRef.current = { ...loadingRef.current, [projectId]: false };
      setLoadingReports(prev => ({ ...prev, [projectId]: false }));
    }
  }, []); // Removed loadingReports dependency

  // Select a report for a project
  const selectReport = useCallback((projectId: string, reportId: string) => {
    setSelectedReports(prev => ({ ...prev, [projectId]: reportId }));
    saveSelectedReportId(projectId, reportId);
    
    // Dispatch event for any listeners
    window.dispatchEvent(new CustomEvent('reportSelectionChanged', {
      detail: { projectId, reportId }
    }));
  }, []);

  // Get the selected report for a project
  const getSelectedReport = useCallback((projectId: string): ReportResponse | null => {
    const projectReports = reports[projectId];
    const selectedId = selectedReports[projectId];
    
    if (!projectReports || !selectedId) return null;
    
    return projectReports.find(r => r.id === selectedId) || null;
  }, [reports, selectedReports]);

  // Load saved selections on mount
  useEffect(() => {
    // This would ideally iterate through known projects, but for now
    // selections will be loaded when fetchReports is called
  }, []);

  const value: ReportContextValue = {
    reports,
    selectedReports,
    loadingReports,
    fetchReports,
    selectReport,
    getSelectedReport,
  };

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error("useReports must be used within a ReportProvider");
  }
  return context;
}