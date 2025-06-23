"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";

interface TopSourcesCardProps {
  sources: Array<{
    domain: string;
    count: number;
  }>;
  loading?: boolean;
}

export function TopSourcesCard({ sources, loading }: TopSourcesCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Calculate total and percentages
  const { displaySources, total } = useMemo(() => {
    const displayItems = expanded ? sources?.slice(0, 10) : sources?.slice(0, 5);
    const totalCount = displayItems?.reduce((sum, item) => sum + item.count, 0) || 0;
    return { displaySources: displayItems, total: totalCount };
  }, [sources, expanded]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Top Sources
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
          <TrendingUp className="h-5 w-5 text-green-600" />
          Top {expanded ? '10' : '5'} Sources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displaySources && displaySources.length > 0 ? (
            <>
              {displaySources.map((source, index) => {
                const percentage = total > 0 ? Math.round((source.count / total) * 100) : 0;
                // Use gradient colors for visual appeal
                const colors = [
                  'from-emerald-500 to-emerald-600',
                  'from-teal-500 to-teal-600',
                  'from-cyan-500 to-cyan-600',
                  'from-sky-500 to-sky-600',
                  'from-blue-500 to-blue-600',
                  'from-indigo-500 to-indigo-600',
                  'from-violet-500 to-violet-600',
                  'from-purple-500 to-purple-600',
                  'from-fuchsia-500 to-fuchsia-600',
                  'from-pink-500 to-pink-600',
                ];
                const colorClass = colors[index % colors.length];

                return (
                  <div
                    key={source.domain}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-600 w-6">
                        #{index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate mr-2">
                            {source.domain}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-semibold text-gray-700">
                              {percentage}%
                            </span>
                            <span className="text-xs text-gray-500">
                              ({source.count})
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
              {sources && sources.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="w-full mt-2 text-gray-600 hover:text-gray-900"
                >
                  {expanded ? 'Show less' : `Show ${Math.min(5, sources.length - 5)} more`}
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No sources found
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}