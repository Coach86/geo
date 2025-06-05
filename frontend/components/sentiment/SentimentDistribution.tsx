"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Meh, Frown } from "lucide-react";

interface SentimentCounts {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

interface SentimentDistributionProps {
  sentimentCounts: SentimentCounts;
}

export function SentimentDistribution({ sentimentCounts }: SentimentDistributionProps) {
  const calculatePercentage = (count: number) =>
    Math.round((count / sentimentCounts.total) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Positive Sentiment */}
      <div>
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-accent-50 border-accent-200">
          <CardHeader className="pb-4 bg-accent-100">
            <CardTitle className="text-lg font-semibold text-accent-700 flex items-center gap-2">
              <div>
                <Heart className="h-5 w-5" />
              </div>
              Positive Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-accent-700">
              {sentimentCounts.positive}{" "}
              <span className="text-sm font-normal">responses</span>
            </div>
            <div className="text-sm text-accent-600 mt-1">
              {calculatePercentage(sentimentCounts.positive)}% of total
            </div>
            <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-500 rounded-full"
                style={{
                  width: `${calculatePercentage(sentimentCounts.positive)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Neutral Sentiment */}
      <div>
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-primary-50 border-primary-200">
          <CardHeader className="pb-4 bg-primary-100">
            <CardTitle className="text-lg font-semibold text-primary-700 flex items-center gap-2">
              <div>
                <Meh className="h-5 w-5" />
              </div>
              Neutral Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-primary-700">
              {sentimentCounts.neutral}{" "}
              <span className="text-sm font-normal">responses</span>
            </div>
            <div className="text-sm text-primary-600 mt-1">
              {calculatePercentage(sentimentCounts.neutral)}% of total
            </div>
            <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full"
                style={{
                  width: `${calculatePercentage(sentimentCounts.neutral)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Negative Sentiment */}
      <div>
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-destructive-50 border-destructive-200">
          <CardHeader className="pb-4 bg-destructive-100">
            <CardTitle className="text-lg font-semibold text-destructive-700 flex items-center gap-2">
              <div>
                <Frown className="h-5 w-5" />
              </div>
              Negative Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-destructive-700">
              {sentimentCounts.negative}{" "}
              <span className="text-sm font-normal">responses</span>
            </div>
            <div className="text-sm text-destructive-600 mt-1">
              {calculatePercentage(sentimentCounts.negative)}% of total
            </div>
            <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-destructive-500 rounded-full"
                style={{
                  width: `${calculatePercentage(sentimentCounts.negative)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}