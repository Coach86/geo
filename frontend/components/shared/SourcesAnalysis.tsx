"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";

interface CitationItem {
  domain: string;
  url: string;
  title?: string;
  prompts: string[];
  sentiments?: string[];
  scores?: number[];
  models: string[];
  count: number;
  text?: string;
}

interface SourcesAnalysisProps {
  citations: {
    items: CitationItem[];
    uniqueDomains: number;
    totalCitations: number;
  } | undefined;
  type: 'sentiment' | 'alignment';
  loading?: boolean;
}

export function SourcesAnalysis({ citations, type, loading }: SourcesAnalysisProps) {
  const analysis = React.useMemo(() => {
    if (!citations || !citations.items || citations.items.length === 0) {
      return {
        riskyUrls: 0,
        totalUrls: 0,
        percentage: 0,
        riskyDomains: 0,
      };
    }

    let riskyUrls = 0;
    const riskyDomainsSet = new Set<string>();

    citations.items.forEach(item => {
      let isRisky = false;

      if (type === 'sentiment') {
        // Check for negative sentiment
        if (item.sentiments && item.sentiments.includes('negative')) {
          isRisky = true;
        }
      } else if (type === 'alignment') {
        // Check for alignment scores <= 50% (0.5)
        if (item.scores && item.scores.some(score => score <= 0.5)) {
          isRisky = true;
        }
      }

      if (isRisky) {
        riskyUrls++;
        riskyDomainsSet.add(item.domain);
      }
    });

    const totalUrls = citations.items.length;
    const percentage = totalUrls > 0 ? Math.round((riskyUrls / totalUrls) * 100) : 0;

    return {
      riskyUrls,
      totalUrls,
      percentage,
      riskyDomains: riskyDomainsSet.size,
    };
  }, [citations, type]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm h-full">
        <CardHeader className="pb-4">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center">
          <div className="space-y-3 w-full">
            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = () => {
    if (analysis.percentage >= 30) return "destructive";
    if (analysis.percentage >= 15) return "secondary";
    return "default";
  };


  const getStatusText = () => {
    if (analysis.percentage >= 30) return "High Risk";
    if (analysis.percentage >= 15) return "Medium Risk";
    return "Low Risk";
  };

  const getDescription = () => {
    if (type === 'sentiment') {
      return `URLs with negative sentiment`;
    } else {
      return `URLs with alignment ≤ 50%`;
    }
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Sources Watchtower
          </CardTitle>
          <div 
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors border ${
              getStatusColor() === "destructive" 
                ? "bg-destructive-50 text-destructive-700 border-destructive-200" 
                : getStatusColor() === "secondary"
                ? "bg-orange-50 text-orange-700 border-orange-200"
                : "bg-green-50 text-green-700 border-green-200"
            }`}
          >
            {analysis.percentage}% • {getStatusText()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 flex-1 flex flex-col justify-center">
        <div className="w-full">
          {/* Main Metric */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl font-bold text-gray-900">
                {analysis.riskyUrls}
              </span>
              <span className="text-base text-gray-500">/ {analysis.totalUrls}</span>
            </div>
            <p className="text-sm text-gray-600">{getDescription()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
