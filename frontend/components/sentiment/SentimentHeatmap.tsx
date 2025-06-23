"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelDisplay } from "@/components/shared/ModelDisplay";
import { MousePointer2, LayoutGrid } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportResponse } from "@/types/reports";
import { getReportSentiment } from "@/lib/api/report";

interface SentimentHeatmapProps {
  reports: ReportResponse[];
  selectedReport: ReportResponse | null;
  onReportSelect: (report: ReportResponse | null) => void;
  token: string | null;
  onCellClick?: (model: string, sentiment: string, status: string, question: string, llmResponse?: string, modelData?: any) => void;
  onSentimentDataLoaded?: (data: any) => void;
}

interface SentimentData {
  heatmapData: {
    question: string;
    results: {
      model: string;
      sentiment: string;
      status: string;
      llmResponse?: string;
    }[];
  }[];
  modelSentiments?: {
    model: string;
    sentiment: string;
    status: string;
    positiveKeywords: string[];
    negativeKeywords: string[];
  }[];
}

export function SentimentHeatmap({ 
  reports, 
  selectedReport, 
  onReportSelect, 
  token,
  onCellClick,
  onSentimentDataLoaded 
}: SentimentHeatmapProps) {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
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

  // Fetch sentiment data for selected report
  useEffect(() => {
    const fetchSentimentData = async () => {
      if (!selectedReport || !token) {
        setSentimentData(null);
        return;
      }

      setLoading(true);
      try {
        const data = await getReportSentiment(selectedReport.id, token);
        setSentimentData(data);
        // Pass the sentiment data to parent component
        onSentimentDataLoaded?.(data);
      } catch (error) {
        console.error("Failed to fetch sentiment data:", error);
        setSentimentData(null);
        onSentimentDataLoaded?.(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSentimentData();
  }, [selectedReport, token]);

  // Get color based on sentiment - using same colors as Sentiment Trend Analysis
  const getSentimentColor = (status: string) => {
    switch (status) {
      case "green":
        return "#10B981"; // Same green as trend chart (positive)
      case "yellow":
        return "#F59E0B"; // Same amber/orange as trend chart (neutral)
      case "red":
        return "#EF4444"; // Same red as trend chart (negative)
      default:
        return "#636366"; // mono-500 (default gray)
    }
  };

  const sentimentHeatmap = sentimentData?.heatmapData || [];

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-purple-600" />
              Sentiment Heatmap
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Model sentiment analysis across different prompts
            </p>
          </div>
          {reports.length > 0 && (
            <Select
              value={selectedReport?.id || ""}
              onValueChange={(value) => {
                const report = reports.find(r => r.id === value);
                onReportSelect(report || null);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a report" />
              </SelectTrigger>
              <SelectContent>
                {reports.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    {new Date(report.generatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {" "}
                    {new Date(report.generatedAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : sentimentHeatmap.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr>
                  <th className="text-left text-sm font-semibold text-gray-700 p-0 w-[30%]">
                    <div className="px-3 py-2 border-b border-gray-300">Prompts</div>
                  </th>
                  {/* Get unique models from the first question */}
                  {sentimentHeatmap[0]?.results.map((result, index) => (
                    <th
                      key={index}
                      className="text-center text-sm font-semibold text-gray-700 p-0 w-[70%]"
                      style={{ width: `${70 / (sentimentHeatmap[0]?.results.length || 1)}%` }}
                    >
                      <div className="px-2 py-2 border-b border-gray-300">
                        <ModelDisplay model={result.model} size="xs" className="justify-center" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sentimentHeatmap.map((q, qIndex) => (
                  <tr key={qIndex}>
                    <td className="p-0 font-medium text-gray-700 border-b border-r border-gray-300">
                      <div className="px-3 py-3 h-[80px] flex items-center">
                        {q.question.split("\n").map((line, i) => (
                          <div key={i} className="text-sm">{line}</div>
                        ))}
                      </div>
                    </td>
                    {q.results.map((result, mIndex) => {
                      const color = getSentimentColor(result.status);

                      return (
                        <td
                          key={mIndex}
                          className="p-0 relative group border-b border-r border-gray-300"
                        >
                          <div
                            className="w-full h-[80px] cursor-pointer relative overflow-hidden transition-all duration-200 hover:brightness-110"
                            style={{
                              backgroundColor: color,
                            }}
                            onClick={() => {
                              // Find the model sentiment data that includes keywords
                              const modelData = sentimentData?.modelSentiments?.find(
                                ms => ms.model === result.model
                              );
                              onCellClick?.(result.model, result.sentiment, result.status, q.question, result.llmResponse, modelData);
                            }}
                            title={`Click to view ${result.model} analysis`}
                          >
                            {/* Click indicator */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="bg-white/90 rounded-full p-2 shadow-lg">
                                <MousePointer2 className="h-4 w-4 text-gray-700" />
                              </div>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-gray-400 italic">
              {reports.length === 0 ? "No reports available" : "Select a report to view sentiment heatmap"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}