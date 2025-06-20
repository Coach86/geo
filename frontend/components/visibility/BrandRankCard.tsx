"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

interface BrandRankCardProps {
  mentions: Array<{
    mention: string;
    count: number;
  }>;
  brandName: string;
  loading?: boolean;
}

export function BrandRankCard({ mentions, brandName, loading }: BrandRankCardProps) {
  // Find brand rank in mentions
  const brandRank = mentions.findIndex(m => m.mention.toLowerCase() === brandName.toLowerCase()) + 1;

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Brand Rank
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Brand Rank
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          {brandRank > 0 ? (
            <>
              <div className="text-4xl font-bold text-primary-600">
                #{brandRank}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                in top mentions
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500 italic">
              Not in top mentions
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}