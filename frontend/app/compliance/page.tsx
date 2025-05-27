"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import AttributeAlignmentTable from "@/components/compliance/attribute-alignment-table";
import AttributeScoresByModelTable from "@/components/compliance/attribute-scores-table";
import { getCompanyReports, getBatchResults } from "@/lib/auth-api";
import { useAuth } from "@/providers/auth-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ComplianceResults } from "@/types/compliance";
import { transformAccordToCompliance } from "@/utils/compliance-transformer";
import {
  ComplianceLoading,
  ComplianceError,
  ComplianceNoCompany,
  ComplianceNoData,
} from "@/components/compliance/ComplianceStates";

interface ProcessedReport {
  id: string;
  companyId: string;
  reportDate: string;
  createdAt: string;
  complianceData: ComplianceResults;
  brandName: string;
}

export default function CompliancePage() {
  const { token } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [reports, setReports] = useState<ProcessedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ProcessedReport | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overviewRef, overviewInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [tableRef, tableInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Get selected company from localStorage and listen for changes
  useEffect(() => {
    const fetchComplianceData = async () => {
      const companyId = localStorage.getItem("selectedCompanyId");

      console.log(
        "[Compliance] Selected companyId:",
        companyId,
        "token:",
        token
      );

      if (!companyId || !token) {
        console.log("[Compliance] No companyId or token");
        setSelectedCompanyId(null);
        setReports([]);
        setSelectedReport(null);
        setIsLoading(false);
        return;
      }

      setSelectedCompanyId(companyId);
      setIsLoading(true);
      setError(null);
      try {
        const apiReports = await getCompanyReports(companyId, token);
        console.log("[Compliance] apiReports:", apiReports);

        if (!apiReports || apiReports.length === 0) {
          throw new Error("No reports available for compliance analysis");
        }

        // Process all reports
        const processedReports: ProcessedReport[] = [];

        for (const report of apiReports) {
          console.log("[Compliance] Processing report:", report.id);
          // Always fetch batch results for compliance/accord data
          let complianceData = null;
          try {
            const batchResults = await getBatchResults(report.id, token);
            console.log(
              "[Compliance] batchResults for report",
              report.id,
              ":",
              batchResults
            );
            // Find the accuracy pipeline results (support both resultType and pipelineType for compatibility)
            const accuracyResult = batchResults.find(
              (result: any) =>
                result.resultType === "accuracy" ||
                result.pipelineType === "accuracy"
            );
            console.log(accuracyResult);
            if (accuracyResult && accuracyResult.result) {
              // If results is a string, parse it
              const accuracyData =
                typeof accuracyResult.result === "string"
                  ? JSON.parse(accuracyResult.result)
                  : accuracyResult.result;

              complianceData = transformAccordToCompliance(accuracyData);
            } else {
              console.warn(
                "[Compliance] No accuracy batch result for report:",
                report.id
              );
            }
          } catch (err) {
            console.error(
              "Failed to fetch batch results for report:",
              report.id,
              err
            );
          }

          if (complianceData) {
            processedReports.push({
              id: report.id,
              companyId: report.companyId,
              reportDate: report.reportDate || report.generatedAt,
              createdAt: report.generatedAt,
              complianceData,
              brandName: report.brand?.name || "Your Brand",
            });
          }
        }

        if (processedReports.length === 0) {
          console.warn(
            "[Compliance] No processed reports created. No accuracy batch results found."
          );
        }

        // Sort reports by date (most recent first)
        processedReports.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setReports(processedReports);
        if (processedReports.length > 0) {
          console.log(
            "[Compliance] Setting selected report to:",
            processedReports[0]
          );
          setSelectedReport(processedReports[0]); // Select the most recent report by default
        }
      } catch (err) {
        console.error("Error fetching compliance data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An unknown error occurred while fetching compliance data."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchComplianceData();

    // Listen for company selection changes
    const handleStorageChange = () => {
      fetchComplianceData();
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom events from the same tab
    window.addEventListener("companySelectionChanged", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "companySelectionChanged",
        handleStorageChange
      );
    };
  }, [token]);

  if (isLoading) return <ComplianceLoading />;

  if (error) return <ComplianceError error={error} />;

  if (!selectedCompanyId || !token) return <ComplianceNoCompany />;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!selectedReport) return <ComplianceNoData />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header with Report Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Compliance Report
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Monitor brand compliance and attribute alignment across AI models
            </p>
          </div>

          {/* Report Selector */}
          <Select
            value={selectedReport?.id || ""}
            onValueChange={(value) => {
              const report = reports.find((r) => r.id === value);
              if (report) {
                setSelectedReport(report);
              }
            }}
            disabled={isLoading || reports.length === 0}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a report" />
            </SelectTrigger>
            <SelectContent>
              {reports.map((report, index) => (
                <SelectItem key={report.id} value={report.id}>
                  {formatDate(report.reportDate)}
                  {index === 0 && (
                    <span className="ml-2 text-xs text-gray-500">(Latest)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          <motion.div
            ref={overviewRef}
            initial={{ opacity: 0, y: 20 }}
            animate={
              overviewInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
            }
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Accordion
              type="single"
              collapsible
              className="w-full bg-white rounded-lg shadow-md border border-gray-200"
            >
              <AccordionItem value="overall-compliance" className="border-b-0">
                <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 rounded-t-lg group">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-left">
                      <h2 className="text-lg font-semibold text-gray-700 group-hover:text-primary-600 transition-colors">
                        Overall Compliance Snapshot
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Average compliance across all models. Click to expand
                        for attribute alignment details.
                      </p>
                    </div>
                    <span className="text-2xl sm:text-3xl font-bold text-primary-500 group-hover:text-primary-600 transition-colors">
                      {(
                        selectedReport.complianceData.summary
                          .overallComplianceScore * 100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 rounded-b-lg">
                  <AttributeAlignmentTable
                    alignmentData={
                      selectedReport.complianceData.summary
                        .attributeAlignmentSummary
                    }
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>

          <motion.div
            ref={tableRef}
            initial={{ opacity: 0, y: 20 }}
            animate={tableInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            <Card className="w-full bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <CardHeader className="px-6 py-5 border-b border-gray-200 bg-gray-50/80">
                <CardTitle className="text-lg font-semibold text-gray-700">
                  Attribute Scores by Model
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  Detailed breakdown of compliance scores for each attribute
                  across different LLMs. Click on a score cell for an in-depth
                  view.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 sm:p-6">
                  <AttributeScoresByModelTable
                    results={selectedReport.complianceData}
                  />
                </div>
                <div className="px-6 py-3 bg-gray-50/80 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Data sourced from the latest brand intelligence report.
                    Compliance scores are calculated based on attribute
                    alignment and accuracy metrics.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
