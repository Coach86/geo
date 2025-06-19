"use client";

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
  // For now, competition doesn't have citations data in the API
  // This component is prepared for when citations become available
  
  // Create mock/empty citations structure for now
  const competitionCitations = citations || {
    items: [],
    uniqueDomains: 0,
    totalCitations: 0,
  };

  return (
    <SourcesWatchtower
      citations={competitionCitations}
      type="alignment" // Using alignment type since competition is similar
      loading={loading}
    />
  );
}