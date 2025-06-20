"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import { useState, useMemo } from "react";

interface MentionsListCardProps {
  mentions: Array<{
    mention: string;
    count: number;
  }>;
  loading?: boolean;
}

export function MentionsListCard({ mentions, loading }: MentionsListCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Calculate total and percentages
  const { displayMentions, total } = useMemo(() => {
    const displayItems = expanded ? mentions?.slice(0, 10) : mentions?.slice(0, 5);
    const totalCount = displayItems?.reduce((sum, item) => sum + item.count, 0) || 0;
    return { displayMentions: displayItems, total: totalCount };
  }, [mentions, expanded]);

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
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
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
          Top {expanded ? '10' : '5'} Mentions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayMentions && displayMentions.length > 0 ? (
            <>
              {displayMentions.map((item, index) => {
                const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                // Use gradient colors for visual appeal
                const colors = [
                  'from-blue-500 to-blue-600',
                  'from-indigo-500 to-indigo-600',
                  'from-purple-500 to-purple-600',
                  'from-pink-500 to-pink-600',
                  'from-rose-500 to-rose-600',
                  'from-orange-500 to-orange-600',
                  'from-amber-500 to-amber-600',
                  'from-yellow-500 to-yellow-600',
                  'from-lime-500 to-lime-600',
                  'from-green-500 to-green-600',
                ];
                const colorClass = colors[index % colors.length];

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-600 w-6">
                        #{index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate mr-2">
                            {item.mention}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-semibold text-gray-700">
                              {percentage}%
                            </span>
                            <span className="text-xs text-gray-500">
                              ({item.count})
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${colorClass} transition-all duration-500 ease-out`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {mentions && mentions.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="w-full mt-2 text-gray-600 hover:text-gray-900"
                >
                  {expanded ? 'Show less' : `Show ${Math.min(5, mentions.length - 5)} more`}
                </Button>
              )}
            </>
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