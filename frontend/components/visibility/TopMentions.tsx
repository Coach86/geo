"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";

interface SpontaneousData {
  summary?: {
    topMentions?: string[];
    topMentionCounts?: {
      mention: string;
      count: number;
    }[];
  };
}

interface TopMentionsProps {
  spontaneousData: SpontaneousData | null;
  loadingSpontaneous: boolean;
}

export function TopMentions({ spontaneousData, loadingSpontaneous }: TopMentionsProps) {

  return (
    <div>
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-dark-700 flex items-center gap-2">
            <div>
              <Brain className="h-5 w-5 text-accent-600" />
            </div>
            Top Mentions
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Brands most frequently mentioned across AI responses
          </p>
        </CardHeader>
      <CardContent>
        {loadingSpontaneous ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">Loading top mentions...</div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mt-2">
              {spontaneousData?.summary?.topMentions && spontaneousData.summary.topMentions.length > 0 ? (
                // Check if we have actual counts from spontaneous data
                spontaneousData.summary.topMentionCounts ? (
                  // Display mentions with counts if available
                  spontaneousData.summary.topMentionCounts.map((item, index) => (
                    <div key={index}>
                      <Badge
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
                          <span className="ml-1 text-xs">
                            👑
                          </span>
                        )}
                      </Badge>
                    </div>
                  ))
                ) : (
                  // Fallback to displaying just mentions without counts
                  spontaneousData.summary.topMentions.map((mention, index) => (
                    <div key={index}>
                      <Badge
                        variant={index < 3 ? "default" : "outline"}
                        className={`
                          ${index < 3
                            ? "bg-secondary-100 text-secondary-800 border-secondary-200"
                            : "border-gray-300 text-gray-700"
                          }
                          text-sm font-medium px-3 py-1
                        `}
                      >
                        {mention}
                        {index === 0 && (
                          <span className="ml-1 text-xs">
                            👑
                          </span>
                        )}
                      </Badge>
                    </div>
                  ))
                )
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No top mentions found.
                </p>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-3">
              These are the brands most frequently mentioned in responses.
            </p>
          </>
        )}
      </CardContent>
    </Card>
    </div>
  );
}