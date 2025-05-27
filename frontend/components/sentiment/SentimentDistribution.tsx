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
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-[#E3F2FD] border-[#90CAF9]">
        <CardHeader className="pb-4 bg-[#90CAF9] bg-opacity-30">
          <CardTitle className="text-lg font-semibold text-[#0D47A1] flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Positive Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-3xl font-bold text-[#0D47A1]">
            {sentimentCounts.positive}{" "}
            <span className="text-sm font-normal">responses</span>
          </div>
          <div className="text-sm text-[#1976D2] mt-1">
            {calculatePercentage(sentimentCounts.positive)}% of total
          </div>
          <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2196F3] rounded-full transition-all duration-500"
              style={{
                width: `${calculatePercentage(sentimentCounts.positive)}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Neutral Sentiment */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-[#EDE7F6] border-[#B39DDB]">
        <CardHeader className="pb-4 bg-[#B39DDB] bg-opacity-30">
          <CardTitle className="text-lg font-semibold text-[#4527A0] flex items-center gap-2">
            <Meh className="h-5 w-5" />
            Neutral Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-3xl font-bold text-[#4527A0]">
            {sentimentCounts.neutral}{" "}
            <span className="text-sm font-normal">responses</span>
          </div>
          <div className="text-sm text-[#673AB7] mt-1">
            {calculatePercentage(sentimentCounts.neutral)}% of total
          </div>
          <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-[#673AB7] rounded-full transition-all duration-500"
              style={{
                width: `${calculatePercentage(sentimentCounts.neutral)}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Negative Sentiment */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-[#FCE4EC] border-[#F48FB1]">
        <CardHeader className="pb-4 bg-[#F48FB1] bg-opacity-30">
          <CardTitle className="text-lg font-semibold text-[#AD1457] flex items-center gap-2">
            <Frown className="h-5 w-5" />
            Negative Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-3xl font-bold text-[#AD1457]">
            {sentimentCounts.negative}{" "}
            <span className="text-sm font-normal">responses</span>
          </div>
          <div className="text-sm text-[#C2185B] mt-1">
            {calculatePercentage(sentimentCounts.negative)}% of total
          </div>
          <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C2185B] rounded-full transition-all duration-500"
              style={{
                width: `${calculatePercentage(sentimentCounts.negative)}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}