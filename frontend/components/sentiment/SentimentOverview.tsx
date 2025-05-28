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
          <CardTitle className="text-lg font-semibold text-dark-700 flex items-center gap-2">
            <div>
              <Sparkles className="h-5 w-5 text-primary-600" />
            </div>
            Overall Sentiment Score
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Percentage of positive sentiment across all AI model responses
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-1">
                  <h3 className="text-3xl font-bold text-gray-900">
                    {sentimentScore}%
                  </h3>
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Global Average
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  positive sentiment
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  Total Responses
                </div>
                <div className="text-2xl font-bold text-gray-900">
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