"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Download } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { exportToCSV, formatMentionsDataForCSV } from "@/utils/csv-export";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MentionsListCardProps {
  mentions: Array<{
    mention: string;
    count: number;
    percentage?: number;
  }>;
  loading?: boolean;
}

export function MentionsListCard({ mentions, loading }: MentionsListCardProps) {
  // Always show 10 entries
  const { displayMentions, total } = useMemo(() => {
    // Take first 10 mentions, or pad with empty entries if less than 10
    const mentionsList = mentions || [];
    const displayItems = mentionsList.slice(0, 10);
    
    // Pad with empty entries if less than 10
    while (displayItems.length < 10) {
      displayItems.push({ mention: '-', count: 0, percentage: 0 });
    }
    
    const totalCount = mentionsList.reduce((sum, item) => sum + item.count, 0) || 0;
    return { displayMentions: displayItems, total: totalCount };
  }, [mentions]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            Industry Share of Voice
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>% of unique mentions across Visibility answers for each top 10 player</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleExportCSV = () => {
    // Filter out empty entries before exporting
    const validMentions = mentions.filter(m => m.mention !== '-' && m.count > 0);
    const csvData = formatMentionsDataForCSV(validMentions);
    exportToCSV(csvData, `industry-share-of-voice-${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            Industry Share of Voice
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>% of unique mentions across Visibility answers for each top 10 player</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleExportCSV}
            title="Export to CSV"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayMentions && displayMentions.length > 0 ? (
            <>
              {displayMentions.map((item, index) => {
                const percentage = item.count > 0 ? (item.percentage ?? (total > 0 ? Math.round((item.count / total) * 100) : 0)) : 0;
                // Single color with degradation from dark to light
                const opacity = 100 - (index * 8); // Decreases from 100 to 20

                return (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
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
                                  className="h-full bg-blue-500 transition-all duration-500 ease-out"
                                  style={{ 
                                    width: `${percentage}%`,
                                    opacity: opacity / 100
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.count} mentions / {total} total ({percentage}%)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
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