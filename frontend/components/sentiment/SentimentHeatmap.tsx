"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelDisplay } from "@/components/shared/ModelDisplay";

interface SentimentHeatmapProps {
  sentimentHeatmap: {
    question: string;
    results: {
      model: string;
      sentiment: string;
      status: string;
    }[];
  }[];
  onCellClick?: (model: string, sentiment: string, status: string) => void;
}

export function SentimentHeatmap({ sentimentHeatmap, onCellClick }: SentimentHeatmapProps) {

  // Get color based on sentiment
  const getSentimentColor = (status: string) => {
    switch (status) {
      case "green":
        return {
          bg: "rgb(4 191 145 / 0.05)",
          text: "rgb(4 191 145)",
          border: "rgb(4 191 145 / 0.2)",
        };
      case "yellow":
        return {
          bg: "rgb(190 81 3 / 0.05)",
          text: "rgb(190 81 3)",
          border: "rgb(190 81 3 / 0.2)",
        };
      case "red":
        return {
          bg: "rgb(220 38 38 / 0.05)",
          text: "rgb(220 38 38)",
          border: "rgb(220 38 38 / 0.2)",
        };
      default:
        return {
          bg: "rgb(245 245 247)",
          text: "rgb(72 72 74)",
          border: "rgb(238 238 238)",
        };
    }
  };

  // Get sentiment label
  const getSentimentLabel = (status: string) => {
    switch (status) {
      case "green":
        return "Positive";
      case "yellow":
        return "Neutral";
      case "red":
        return "Negative";
      default:
        return "N/A";
    }
  };

  return (
    <div>
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-4">
          <div>
            <CardTitle className="text-lg font-semibold text-mono-700">
              Sentiment Heatmap
            </CardTitle>
            <p className="text-sm text-mono-400 mt-1">
              Model sentiment analysis across different prompts
            </p>
          </div>
        </CardHeader>
      <CardContent>
        {sentimentHeatmap.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-mono-700 border-b-2 border-mono-200 w-1/3">
                    Prompts
                  </th>
                  {/* Get unique models from the first question */}
                  {sentimentHeatmap[0]?.results.map((result, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-center text-sm font-semibold text-mono-700 border-b-2 border-mono-200"
                    >
                      <ModelDisplay model={result.model} size="xs" className="justify-center" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sentimentHeatmap.map((q, qIndex) => (
                  <tr key={qIndex}>
                    <td className="px-4 py-3 border-b border-mono-200 font-medium text-mono-700">
                      {q.question.split("\n").map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </td>
                    {q.results.map((result, mIndex) => {
                      const colors = getSentimentColor(result.status);
                      const sentimentLabel = getSentimentLabel(result.status);

                      return (
                        <td
                          key={mIndex}
                          className={`px-4 py-3 border-b border-mono-200 text-center ${
                            onCellClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
                          }`}
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderLeft: `1px solid ${colors.border}`,
                            borderRight: `1px solid ${colors.border}`,
                          }}
                          onClick={() => onCellClick?.(result.model, result.sentiment, result.status)}
                          title={onCellClick ? `Click to view ${result.model} analysis` : undefined}
                        >
                          <div className="font-medium">{sentimentLabel}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-mono-400 italic">No sentiment heatmap data available.</p>
        )}
      </CardContent>
    </Card>
    </div>
  );
}