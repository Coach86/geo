"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hash } from "lucide-react";

interface TopMentionsCardProps {
  keywords: Array<{
    keyword: string;
    count: number;
  }>;
  loading?: boolean;
}

export function TopMentionsCard({ keywords, loading }: TopMentionsCardProps) {
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Hash className="h-5 w-5 text-purple-600" />
            Top Keywords
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

  // Filter out 'unknown' keywords
  const filteredKeywords = keywords?.filter(item => 
    item.keyword.toLowerCase() !== 'unknown'
  ) || [];

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Hash className="h-5 w-5 text-purple-600" />
          Top Keywords
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {filteredKeywords.length > 0 ? (
            filteredKeywords.slice(0, 10).map((item, index) => (
              <Badge
                key={index}
                variant={index < 3 ? "default" : "outline"}
                className={`
                  ${index < 3
                    ? "bg-purple-100 text-purple-800 border-purple-200"
                    : "border-gray-300 text-gray-700"
                  }
                  text-sm font-medium px-3 py-1
                `}
              >
                {item.keyword} ({item.count})
                {index === 0 && (
                  <span className="ml-1 text-xs">🔍</span>
                )}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic">
              No keywords available
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}