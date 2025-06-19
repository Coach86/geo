"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelDisplay } from "@/components/shared/ModelDisplay";
import { MousePointer2 } from "lucide-react";
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
    if (reports.length > 0 && !selectedReport) {
      onReportSelect(reports[0]);
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

  // Get color based on sentiment - using sentiment value colors directly
  const getSentimentColor = (status: string) => {
    switch (status) {
      case "green":
        return "#039974"; // accent-600 (positive)
      case "yellow":
        return "#A44703"; // primary-600 (neutral)
      case "red":
        return "#B91C1C"; // destructive-600 (negative)
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
            <CardTitle className="text-lg font-semibold text-gray-900">
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
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-sm font-semibold text-gray-700 p-0 w-1/3">
                    <div className="px-3 py-2 border-b-2 border-gray-200">Prompts</div>
                  </th>
                  {/* Get unique models from the first question */}
                  {sentimentHeatmap[0]?.results.map((result, index) => (
                    <th
                      key={index}
                      className="text-center text-sm font-semibold text-gray-700 p-0"
                    >
                      <div className="px-2 py-2 border-b-2 border-gray-200">
                        <ModelDisplay model={result.model} size="xs" className="justify-center" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sentimentHeatmap.map((q, qIndex) => (
                  <tr key={qIndex}>
                    <td className="p-0 font-medium text-gray-700">
                      <div className="px-3 py-2 border-r border-gray-200">
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
                          className="p-0 relative group"
                        >
                          <div
                            className="w-full h-full min-h-[60px] cursor-pointer relative overflow-hidden transition-all duration-200 hover:brightness-110"
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