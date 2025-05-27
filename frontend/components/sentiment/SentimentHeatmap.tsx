"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelIcon } from "@/components/ui/model-icon";

interface SentimentHeatmapProps {
  sentimentHeatmap: {
    question: string;
    results: {
      model: string;
      sentiment: string;
      status: string;
    }[];
  }[];
}

export function SentimentHeatmap({ sentimentHeatmap }: SentimentHeatmapProps) {
  // Get color based on sentiment
  const getSentimentColor = (status: string) => {
    switch (status) {
      case "green":
        return {
          bg: "#E3F2FD",
          text: "#0D47A1",
          border: "#90CAF9",
        };
      case "yellow":
        return {
          bg: "#EDE7F6",
          text: "#4527A0",
          border: "#B39DDB",
        };
      case "red":
        return {
          bg: "#FCE4EC",
          text: "#AD1457",
          border: "#F48FB1",
        };
      default:
        return {
          bg: "#F5F5F5",
          text: "#616161",
          border: "#E0E0E0",
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
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-dark-700">
          Sentiment Heatmap
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Model sentiment analysis across different prompts
        </p>
      </CardHeader>
      <CardContent>
        {sentimentHeatmap.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200 w-1/3">
                    Prompts
                  </th>
                  {/* Get unique models from the first question */}
                  {sentimentHeatmap[0]?.results.map((result, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-200"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <ModelIcon model={result.model} size="xs" />
                        {result.model}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sentimentHeatmap.map((q, qIndex) => (
                  <tr key={qIndex}>
                    <td className="px-4 py-3 border-b border-gray-200 font-medium">
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
                          className="px-4 py-3 border-b border-gray-200 text-center"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderLeft: `1px solid ${colors.border}`,
                            borderRight: `1px solid ${colors.border}`,
                          }}
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
          <p className="text-sm text-gray-400 italic">No sentiment heatmap data available.</p>
        )}
      </CardContent>
    </Card>
  );
}