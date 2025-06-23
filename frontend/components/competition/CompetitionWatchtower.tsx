"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, FileSearch } from "lucide-react";
import { SourcesWatchtower } from "@/components/shared/SourcesWatchtower";

interface CompetitionWatchtowerProps {
  citations: {
    items: Array<{
      domain: string;
      url: string;
      title?: string;
      prompts: string[];
      models: string[];
      count: number;
      text?: string;
    }>;
    uniqueDomains: number;
    totalCitations: number;
  } | undefined;
  loading?: boolean;
}

export function CompetitionWatchtower({
  citations,
  loading = false,
}: CompetitionWatchtowerProps) {
  // Handle null citations from API
  const competitionCitations = citations || {
    items: [],
    uniqueDomains: 0,
    totalCitations: 0,
  };
  
  if (competitionCitations.items.length === 0) {
    return (
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary-600" />
            Competition Sources Watchtower
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileSearch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Citations Available
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Citations will be tracked in future batch analyses. Run a new batch to see sources and citations 
              for competitive insights across different AI models.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <SourcesWatchtower
      citations={competitionCitations}
      type="competition"
      loading={loading}
    />
  );
}