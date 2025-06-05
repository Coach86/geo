"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface SentimentOverviewProps {
  sentimentScore: number;
  totalResponses: number;
}

export function SentimentOverview({ sentimentScore, totalResponses }: SentimentOverviewProps) {
  return (
    <div>
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-mono-700 flex items-center gap-2">
            <div>
              <Sparkles className="h-5 w-5 text-primary-500" />
            </div>
            Overall Sentiment Score
          </CardTitle>
          <p className="text-sm text-mono-400 mt-1">
            Percentage of positive sentiment across all AI model responses
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-1">
                  <h3 className="text-3xl font-bold text-mono-900">
                    {sentimentScore}%
                  </h3>
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-secondary-50 text-secondary-700 rounded-full">
                    Global Average
                  </span>
                </div>
                <p className="text-sm text-mono-400">
                  positive sentiment
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-mono-700">
                  Total Responses
                </div>
                <div className="text-2xl font-bold text-mono-900">
                  {totalResponses}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}