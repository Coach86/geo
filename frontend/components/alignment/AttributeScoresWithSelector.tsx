"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableProperties } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportResponse } from "@/types/reports";
import { getReportAlignment } from "@/lib/api/report";
import AttributeScoresByModelTable from "./attribute-scores-table";
import type { AlignmentResults } from "@/types/alignment";

interface AttributeScoresWithSelectorProps {
  reports: ReportResponse[];
  selectedReport: ReportResponse | null;
  onReportSelect: (report: ReportResponse | null) => void;
  token: string | null;
}

export function AttributeScoresWithSelector({
  reports,
  selectedReport,
  onReportSelect,
  token,
}: AttributeScoresWithSelectorProps) {
  const [alignmentData, setAlignmentData] = useState<AlignmentResults | null>(null);
  const [loading, setLoading] = useState(false);

  // Set initial report selection
  useEffect(() => {
    if (reports.length > 0) {
      // If no report is selected, or if the currently selected report is not in the new reports list
      // (which happens when switching projects), select the first report
      if (!selectedReport || !reports.find(r => r.id === selectedReport.id)) {
        onReportSelect(reports[0]);
      }
    } else {
      // No reports available, clear selection
      onReportSelect(null);
    }
  }, [reports, selectedReport, onReportSelect]);

  // Fetch alignment data for selected report
  useEffect(() => {
    const fetchAlignmentData = async () => {
      if (!selectedReport || !token) {
        setAlignmentData(null);
        return;
      }

      setLoading(true);
      try {
        const data = await getReportAlignment(selectedReport.id, token);
        // Transform the data to match AlignmentResults interface
        const alignmentResults: AlignmentResults = {
          summary: {
            overallAlignmentScore: data.summary.overallAlignmentScore,
            averageAttributeScores: data.summary.averageAttributeScores,
            attributeAlignmentSummary: data.summary.attributeAlignmentSummary.map(item => ({
              name: item.attribute,
              score: item.score,
              mentionRate: '0%',
              alignment: item.score >= 80 ? 'aligned' : item.score >= 50 ? 'neutral' : 'misaligned'
            })),
          },
          detailedResults: data.detailedResults || [],
        };
        setAlignmentData(alignmentResults);
      } catch (error) {
        console.error("Failed to fetch alignment data:", error);
        setAlignmentData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAlignmentData();
  }, [selectedReport, token]);

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-mono-700 flex items-center gap-2">
              <TableProperties className="h-5 w-5 text-amber-600" />
              Attribute Scores by Model
            </CardTitle>
            <p className="text-sm text-mono-400 mt-1">
              Detailed breakdown of alignment scores
            </p>
          </div>
          <Select
            value={selectedReport?.id || ""}
            onValueChange={(value) => {
              const report = reports.find(r => r.id === value);
              onReportSelect(report || null);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a date" />
            </SelectTrigger>
            <SelectContent>
              {reports.map((report) => (
                <SelectItem key={report.id} value={report.id}>
                  {new Date(report.generatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  {" "}
                  {new Date(report.generatedAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
          </div>
        ) : alignmentData ? (
          <AttributeScoresByModelTable results={alignmentData} />
        ) : (
          <p className="text-sm text-mono-400 italic text-center py-8">
            No alignment data available for the selected report
          </p>
        )}
      </CardContent>
    </Card>
  );
}