"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";

interface MentionsRankingCardProps {
  mentions: Array<{
    mention: string;
    count: number;
  }>;
  loading?: boolean;
  brandName?: string;
}

export function MentionsRankingCard({ mentions, loading, brandName }: MentionsRankingCardProps) {
  // Find brand rank in mentions
  const brandRank = brandName 
    ? mentions.findIndex(m => m.mention.toLowerCase() === brandName.toLowerCase()) + 1
    : 0;
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent-600" />
            Top Mentions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent-600" />
          {brandRank > 0 ? `Brand Rank: #${brandRank}` : 'Top Mentions'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {mentions && mentions.length > 0 ? (
            mentions.slice(0, 10).map((item, index) => (
              <Badge
                key={index}
                variant={index < 3 ? "default" : "outline"}
                className={`
                  ${index < 3
                    ? "bg-secondary-100 text-secondary-800 border-secondary-200"
                    : "border-gray-300 text-gray-700"
                  }
                  text-sm font-medium px-3 py-1
                `}
              >
                {item.mention} ({item.count})
                {index === 0 && (
                  <span className="ml-1 text-xs">👑</span>
                )}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic">
              No mentions found
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}