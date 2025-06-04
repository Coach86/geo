"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

import type {
  AlignmentResults,
  DetailedAlignmentResult,
  AttributeScore as SingleAttributeScore, // Renaming to avoid conflict with component name
  ToolUseInfo,
  SourceCitation,
} from "@/types/alignment"; // Adjust path if needed

interface AttributeScoresByModelTableProps {
  results: AlignmentResults | null;
}

interface CellData {
  score: number;
  // We need to link this cell back to all detailed results that contribute to it,
  // or at least the primary one if we decide to show one example.
  // For now, let's assume clicking a cell shows details for ONE specific DetailedAlignmentResult
  // that is most relevant or the first one found for that model/attribute combination.
  // A more complex aggregation might be needed in a real scenario for the drawer.
  primaryDetailedResult?: DetailedAlignmentResult; // The specific result to show in drawer
  attributeName: string;
  modelName: string;
}

export default function AttributeScoresByModelTable({
  results,
}: AttributeScoresByModelTableProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCellData, setSelectedCellData] = useState<CellData | null>(
    null
  );

  const tableData = useMemo(() => {
    if (!results || !results.detailedResults.length) return null;

    const { detailedResults, summary } = results;
    const uniqueAttributes = Object.keys(summary.averageAttributeScores).sort();

    // Get models that actually have data (same as AccuracyTab)
    const modelSet = new Set<string>();
    detailedResults.forEach((res) => modelSet.add(res.llmProvider));
    const uniqueModels = Array.from(modelSet).sort();

    const scoresMap: Record<
      string,
      Record<
        string,
        { sum: number; count: number; results: DetailedAlignmentResult[] }
      >
    > = {};

    uniqueModels.forEach((model) => {
      scoresMap[model] = {};
      uniqueAttributes.forEach((attr) => {
        scoresMap[model][attr] = { sum: 0, count: 0, results: [] };
      });
    });

    detailedResults.forEach((detail) => {
      detail.attributeScores.forEach((attrScore) => {
        if (
          scoresMap[detail.llmProvider] &&
          scoresMap[detail.llmProvider][attrScore.attribute]
        ) {
          scoresMap[detail.llmProvider][attrScore.attribute].sum +=
            attrScore.score;
          scoresMap[detail.llmProvider][attrScore.attribute].count += 1;
          scoresMap[detail.llmProvider][attrScore.attribute].results.push(
            detail
          );
        }
      });
    });

    return {
      attributes: uniqueAttributes,
      models: uniqueModels,
      scores: scoresMap,
    };
  }, [results]);

  if (!results || !tableData) {
    return (
      <p className="p-4 text-sm text-gray-600">
        No attribute scores data available to display.
      </p>
    );
  }

  const {
    attributes: tableAttributes,
    models: tableModels,
    scores: tableScores,
  } = tableData;

  const handleCellClick = (modelName: string, attributeName: string) => {
    const modelAttrScores = tableScores[modelName]?.[attributeName];
    if (modelAttrScores && modelAttrScores.count > 0) {
      const avgScore = modelAttrScores.sum / modelAttrScores.count;
      // For simplicity, pick the first detailed result associated with this cell
      // A more sophisticated UI might allow cycling through multiple tests if they contribute to one cell
      const primaryResult = modelAttrScores.results.find((r) =>
        r.attributeScores.some((as) => as.attribute === attributeName)
      );

      setSelectedCellData({
        score: avgScore,
        primaryDetailedResult: primaryResult, // This could be undefined if no direct match, handle in drawer
        attributeName,
        modelName,
      });
      setDrawerOpen(true);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200">
                Attribute
              </th>
              {tableModels.map((modelName) => (
                <th
                  key={modelName}
                  className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200"
                >
                  {modelName}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200">
                Average
              </th>
            </tr>
          </thead>
          <tbody>
            {tableAttributes.map((attributeName) => (
              <tr
                key={attributeName}
                className="hover:bg-gray-50 transition-colors duration-150"
              >
                <td className="px-4 py-3 border-b border-gray-200 text-sm font-medium text-gray-700">
                  {attributeName}
                </td>
                {tableModels.map((modelName) => {
                  const cellScoreData = tableScores[modelName]?.[attributeName];
                  const score =
                    cellScoreData && cellScoreData.count > 0
                      ? cellScoreData.sum / cellScoreData.count
                      : null;
                  return (
                    <td
                      key={`${attributeName}-${modelName}`}
                      className="px-4 py-3 border-b border-gray-200 text-center cursor-pointer hover:underline transition-colors duration-150"
                      onClick={() =>
                        score !== null
                          ? handleCellClick(modelName, attributeName)
                          : undefined
                      }
                    >
                      {score !== null ? (
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            score >= 0.8
                              ? "bg-green-100 text-green-700"
                              : score >= 0.6
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {(score * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 border-b border-gray-200 text-center text-sm font-semibold">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      results.summary.averageAttributeScores[attributeName] >=
                      0.8
                        ? "bg-green-100 text-green-700"
                        : results.summary.averageAttributeScores[
                            attributeName
                          ] >= 0.6
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {(
                      results.summary.averageAttributeScores[attributeName] *
                      100
                    ).toFixed(0)}
                    %
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Right Drawer for Compliance Details */}
      <div
        className={`fixed inset-0 z-50 overflow-hidden ${
          drawerOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${
            drawerOpen ? "opacity-20" : "opacity-0"
          }`}
          onClick={() => setDrawerOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
            drawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedCellData?.attributeName} -{" "}
                {selectedCellData?.modelName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600">Score:</span>
                <Badge
                  variant={
                    selectedCellData && selectedCellData.score >= 0.8
                      ? "default"
                      : selectedCellData && selectedCellData.score >= 0.6
                      ? "secondary"
                      : "destructive"
                  }
                  className={`text-xs ${
                    selectedCellData && selectedCellData.score >= 0.8
                      ? "text-green-700 bg-green-100"
                      : selectedCellData && selectedCellData.score >= 0.6
                      ? "text-yellow-700 bg-yellow-100"
                      : "text-red-700 bg-red-100"
                  }`}
                >
                  {selectedCellData
                    ? (selectedCellData.score * 100).toFixed(0)
                    : 0}
                  %
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Drawer Content */}
          <div className="p-6 overflow-y-auto h-[calc(100%-88px)]">
            {selectedCellData && selectedCellData.primaryDetailedResult ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Evaluation:</h4>
                  <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
                    {selectedCellData.primaryDetailedResult.attributeScores.find(
                      (as) => as.attribute === selectedCellData.attributeName
                    )?.evaluation ||
                      "No specific evaluation for this attribute in this result."}
                  </p>
                </div>

                {selectedCellData.primaryDetailedResult.originalPrompt && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">
                      Original Prompt:
                    </h4>
                    <pre className="text-xs text-gray-700 bg-gray-50 p-2 rounded whitespace-pre-wrap font-sans">
                      {selectedCellData.primaryDetailedResult.originalPrompt}
                    </pre>
                  </div>
                )}

                {selectedCellData.primaryDetailedResult.llmResponse && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">
                      LLM Response:
                    </h4>
                    <pre className="text-xs text-gray-700 bg-gray-50 p-2 rounded whitespace-pre-wrap font-sans">
                      {selectedCellData.primaryDetailedResult.llmResponse}
                    </pre>
                  </div>
                )}

                {selectedCellData.primaryDetailedResult.toolUsage &&
                  selectedCellData.primaryDetailedResult.toolUsage.length >
                    0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">
                        Tool Usage (Web Searches):
                      </h4>
                      <div className="space-y-2">
                        {selectedCellData.primaryDetailedResult.toolUsage.map(
                          (tool, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-gray-50 p-2 rounded border"
                            >
                              <p>
                                <strong>Query:</strong>{" "}
                                {tool.parameters?.query || "N/A"}
                              </p>
                              <div>
                                <strong>Status:</strong>{" "}
                                <Badge
                                  variant={
                                    tool.execution_details?.status === "success"
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {tool.execution_details?.status || "N/A"}
                                </Badge>
                              </div>
                              {tool.execution_details?.result && (
                                <p className="mt-1 italic">
                                  Result:{" "}
                                  {String(
                                    tool.execution_details.result
                                  ).substring(0, 100)}
                                  ...
                                </p>
                              )}
                              {tool.execution_details?.error && (
                                <p className="mt-1 text-red-600">
                                  Error: {tool.execution_details.error}
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {selectedCellData.primaryDetailedResult.citations &&
                  selectedCellData.primaryDetailedResult.citations.length >
                    0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Citations:</h4>
                      <div className="space-y-2">
                        {selectedCellData.primaryDetailedResult.citations.map(
                          (citation, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-gray-50 p-2 rounded border"
                            >
                              <p>
                                <strong>Title:</strong>{" "}
                                {citation.title || "N/A"}
                              </p>
                              <p>
                                <strong>URL:</strong>{" "}
                                <a
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {citation.url}
                                </a>
                              </p>
                              {citation.text && (
                                <p className="mt-1 italic">"{citation.text}"</p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                {selectedCellData.primaryDetailedResult.error && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-red-700">
                      Processing Error for this Test Run:
                    </h4>
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {selectedCellData.primaryDetailedResult.error}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No detailed information available
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
