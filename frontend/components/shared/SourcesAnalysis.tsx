"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Globe, TrendingDown } from "lucide-react";

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
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = () => {
    if (analysis.percentage >= 30) return "destructive";
    if (analysis.percentage >= 15) return "secondary";
    return "accent";
  };

  const getStatusIcon = () => {
    if (analysis.percentage >= 30) return <AlertTriangle className="h-4 w-4 text-destructive-600" />;
    if (analysis.percentage >= 15) return <TrendingDown className="h-4 w-4 text-orange-600" />;
    return <Shield className="h-4 w-4 text-accent-600" />;
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
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          Sources Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Metric */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {getStatusIcon()}
              <span className="text-3xl font-bold text-gray-900">
                {analysis.riskyUrls}
              </span>
              <span className="text-lg text-gray-500">/ {analysis.totalUrls}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{getDescription()}</p>
            
            {/* Status Badge */}
            <Badge 
              variant={getStatusColor()}
              className="text-sm px-3 py-1"
            >
              {analysis.percentage}% • {getStatusText()}
            </Badge>
          </div>

          {/* Additional Stats */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Affected domains:</span>
              <span className="text-sm font-medium text-gray-900">
                {analysis.riskyDomains}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total sources:</span>
              <span className="text-sm font-medium text-gray-900">
                {citations?.uniqueDomains || 0}
              </span>
            </div>
          </div>

          {/* Risk Level Indicator */}
          <div className="pt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  analysis.percentage >= 30 
                    ? 'bg-destructive-500' 
                    : analysis.percentage >= 15 
                    ? 'bg-orange-500'
                    : 'bg-accent-500'
                }`}
                style={{ width: `${Math.min(analysis.percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}