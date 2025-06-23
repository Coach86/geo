"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ModelDisplay } from "@/components/shared/ModelDisplay";

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
  detailedResults: DetailedAlignmentResult[]; // All results for this model/attribute combination
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
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Check if component is mounted for portal rendering
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Keyboard navigation for drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!drawerOpen || !selectedCellData) return;
      
      if (e.key === 'ArrowLeft' && currentResultIndex > 0) {
        setCurrentResultIndex(currentResultIndex - 1);
      } else if (e.key === 'ArrowRight' && currentResultIndex < selectedCellData.detailedResults.length - 1) {
        setCurrentResultIndex(currentResultIndex + 1);
      } else if (e.key === 'Escape') {
        setDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen, currentResultIndex, selectedCellData]);

  const tableData = useMemo(() => {
    if (!results || !results.detailedResults || !results.detailedResults.length) return null;

    const { detailedResults, summary } = results;
    
    // Check if summary exists and has averageAttributeScores
    if (!summary || !summary.averageAttributeScores) {
      console.error("Invalid alignment results structure:", results);
      return null;
    }
    
    const averageAttributeScores = summary.averageAttributeScores;
    const uniqueAttributes = Object.keys(averageAttributeScores).sort();

    // Get models that actually have data (same as AccuracyTab)
    const modelSet = new Set<string>();
    detailedResults.forEach((res) => modelSet.add(res.model));
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
          scoresMap[detail.model] &&
          scoresMap[detail.model][attrScore.attribute]
        ) {
          scoresMap[detail.model][attrScore.attribute].sum +=
            attrScore.score;
          scoresMap[detail.model][attrScore.attribute].count += 1;
          scoresMap[detail.model][attrScore.attribute].results.push(
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
      <p className="p-4 text-sm text-mono-400 italic">
        No attribute scores data available to display.
      </p>
    );
  }
  
  // Additional safety check for results structure
  if (!results.summary || !results.summary.averageAttributeScores) {
    return (
      <p className="p-4 text-sm text-mono-400 italic">
        Invalid alignment data format.
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
      // Filter results to only include those that have scores for the selected attribute
      const relevantResults = modelAttrScores.results.filter((r) =>
        r.attributeScores.some((as) => as.attribute === attributeName)
      );

      if (relevantResults.length > 0) {
        setSelectedCellData({
          score: avgScore,
          detailedResults: relevantResults,
          attributeName,
          modelName,
        });
        setCurrentResultIndex(0); // Reset to first result
        setDrawerOpen(true);
      }
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-mono-700 border-b-2 border-mono-200">
                Attribute
              </th>
              {tableModels.map((modelName) => (
                <th
                  key={modelName}
                  className="px-4 py-3 text-center text-sm font-semibold text-mono-700 border-b-2 border-mono-200"
                >
                  <ModelDisplay model={modelName} size="xs" className="justify-center" />
                </th>
              ))}
              <th className="px-4 py-3 text-center text-sm font-semibold text-mono-700 border-b-2 border-mono-200">
                Average
              </th>
            </tr>
          </thead>
          <tbody>
            {tableAttributes.map((attributeName) => (
              <tr
                key={attributeName}
                className="hover:bg-mono-50 transition-colors duration-150"
              >
                <td className="px-4 py-3 border-b border-mono-200 text-sm font-medium text-mono-700">
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
                      className="px-4 py-3 border-b border-mono-200 text-center cursor-pointer hover:opacity-80 transition-all duration-150"
                      onClick={() =>
                        score !== null
                          ? handleCellClick(modelName, attributeName)
                          : undefined
                      }
                    >
                      {score !== null ? (
                        <span
                          className={`inline-block px-3 py-1.5 rounded-md text-sm font-medium ${
                            score >= 0.8
                              ? "bg-accent-50 text-accent-700 border border-accent-200"
                              : score >= 0.6
                              ? "bg-primary-50 text-primary-700 border border-primary-200"
                              : "bg-destructive-50 text-destructive-700 border border-destructive-200"
                          }`}
                        >
                          {(score * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-mono-400">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 border-b border-mono-200 text-center">
                  <span
                    className={`inline-block px-3 py-1.5 rounded-md text-sm font-semibold ${
                      results.summary.averageAttributeScores[attributeName] >=
                      0.8
                        ? "bg-accent-50 text-accent-700 border border-accent-200"
                        : results.summary.averageAttributeScores[
                            attributeName
                          ] >= 0.6
                        ? "bg-primary-50 text-primary-700 border border-primary-200"
                        : "bg-destructive-50 text-destructive-700 border border-destructive-200"
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
      {mounted && createPortal(
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
          <div className="px-6 py-4 border-b border-mono-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-mono-900">
                  {selectedCellData?.attributeName} -{" "}
                  {selectedCellData?.modelName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-mono-600">Score:</span>
                  <Badge
                    variant={
                      selectedCellData && selectedCellData.score >= 0.8
                        ? "default"
                        : selectedCellData && selectedCellData.score >= 0.6
                        ? "secondary"
                        : "destructive"
                    }
                    className={`text-sm ${
                      selectedCellData && selectedCellData.score >= 0.8
                        ? "text-accent-700 bg-accent-50 border-accent-200"
                        : selectedCellData && selectedCellData.score >= 0.6
                        ? "text-primary-700 bg-primary-50 border-primary-200"
                        : "text-destructive-700 bg-destructive-50 border-destructive-200"
                    } border`}
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
            
            {/* Navigation controls */}
            {selectedCellData && selectedCellData.detailedResults.length > 1 && (
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentResultIndex(Math.max(0, currentResultIndex - 1))}
                    disabled={currentResultIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-mono-600">
                    Result {currentResultIndex + 1} of {selectedCellData.detailedResults.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentResultIndex(Math.min(selectedCellData.detailedResults.length - 1, currentResultIndex + 1))}
                    disabled={currentResultIndex === selectedCellData.detailedResults.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Content */}
          <div className={`p-6 overflow-y-auto ${selectedCellData && selectedCellData.detailedResults.length > 1 ? 'h-[calc(100%-140px)]' : 'h-[calc(100%-88px)]'}`}>
            {selectedCellData && selectedCellData.detailedResults.length > 0 ? (
              (() => {
                const currentResult = selectedCellData.detailedResults[currentResultIndex];
                console.log('Drawer - Current result data:', {
                  model: currentResult.model,
                  hasOriginalPrompt: !!currentResult.originalPrompt,
                  hasLlmResponse: !!currentResult.llmResponse,
                  hasCitations: !!(currentResult.citations && currentResult.citations.length > 0),
                  hasToolUsage: !!(currentResult.toolUsage && currentResult.toolUsage.length > 0),
                  originalPromptLength: currentResult.originalPrompt?.length || 0,
                  llmResponseLength: currentResult.llmResponse?.length || 0,
                  citationsCount: currentResult.citations?.length || 0,
                  fullResult: currentResult
                });
                return (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm text-mono-700 mb-2">Evaluation:</h4>
                      <p className="text-sm text-mono-700 bg-mono-100 p-3 rounded-md border border-mono-200">
                        {currentResult.attributeScores.find(
                          (as) => as.attribute === selectedCellData.attributeName
                        )?.evaluation ||
                          "No specific evaluation for this attribute in this result."}
                      </p>
                    </div>

                    {currentResult.originalPrompt && (
                      <div>
                        <h4 className="font-semibold text-sm text-mono-700 mb-2">
                          Original Prompt:
                        </h4>
                        <pre className="text-sm text-mono-700 bg-mono-100 p-3 rounded-md border border-mono-200 whitespace-pre-wrap font-sans">
                          {currentResult.originalPrompt}
                        </pre>
                      </div>
                    )}

                    {currentResult.llmResponse && (
                      <div>
                        <h4 className="font-semibold text-sm text-mono-700 mb-2">
                          LLM Response:
                        </h4>
                        <pre className="text-sm text-mono-700 bg-mono-100 p-3 rounded-md border border-mono-200 whitespace-pre-wrap font-sans">
                          {currentResult.llmResponse}
                        </pre>
                      </div>
                    )}

                    {currentResult.toolUsage &&
                      currentResult.toolUsage.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-mono-700 mb-2">
                            Tool Usage (Web Searches):
                          </h4>
                          <div className="space-y-2">
                            {currentResult.toolUsage.map(
                              (tool, idx) => (
                                <div
                                  key={idx}
                                  className="text-sm bg-mono-100 p-3 rounded-md border border-mono-200"
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
                                    <p className="mt-1 text-destructive-600">
                                      Error: {tool.execution_details.error}
                                    </p>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {currentResult.citations &&
                      currentResult.citations.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-mono-700 mb-2">Citations:</h4>
                          <div className="space-y-2">
                            {currentResult.citations.map(
                              (citation, idx) => (
                                <div
                                  key={idx}
                                  className="text-sm bg-mono-100 p-3 rounded-md border border-mono-200"
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
                                      className="text-secondary-600 hover:text-secondary-700 hover:underline"
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
                    {currentResult.error && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-destructive-700">
                          Processing Error for this Test Run:
                        </h4>
                        <p className="text-sm text-destructive-600 bg-destructive-50 p-3 rounded-md border border-destructive-200">
                          {currentResult.error}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="text-center text-mono-400 py-8">
                No detailed information available
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
      )}
    </>
  );
}
