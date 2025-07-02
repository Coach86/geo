'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface LLMDetailsProps {
  details: {
    authority: {
      hasAuthor: boolean;
      authorName: string | null;
      citationCount: number;
      domainAuthority: string;
      authorCredentials: string[];
    };
    freshness: {
      daysSinceUpdate: number | null;
      hasDateSignals: boolean;
      publishDate: string | null;
      modifiedDate: string | null;
    };
    structure: {
      h1Count: number;
      avgSentenceWords: number;
      hasSchema: boolean;
      headingHierarchyScore: number;
    };
    brand: {
      brandMentions: number;
      alignmentIssues: string[];
      consistencyScore: number;
      missingKeywords: string[];
    };
  };
}

const DIMENSION_COLORS = {
  authority: '#8b5cf6',
  freshness: '#3b82f6',
  structure: '#10b981',
  brand: '#ef4444',
};

export function LLMAnalysisDetails({ details }: LLMDetailsProps) {
  return null;
}