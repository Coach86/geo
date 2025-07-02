'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LLMAnalysisModal } from './LLMAnalysisModal';
import { LLMAnalysisDetails } from './LLMAnalysisDetails';
import { ScoreCalculationTable } from './ScoreCalculationTable';
import { IssuesByDimension } from './IssuesByDimension';
import { Sparkles, Info, CheckCircle } from 'lucide-react';

interface PageDetailsSectionProps {
  page: {
    url: string;
    details?: any;
    calculationDetails?: {
      authority?: any;
      freshness?: any;
      structure?: any;
      brandAlignment?: any;
    };
    ruleBasedAnalysis?: {
      authority?: {
        score: number;
        details: any;
        issues: any[];
        calculationDetails: any;
      };
      freshness?: {
        score: number;
        details: any;
        issues: any[];
        calculationDetails: any;
      };
      structure?: {
        score: number;
        details: any;
        issues: any[];
        calculationDetails: any;
      };
      brand?: {
        score: number;
        details: any;
        issues: any[];
        calculationDetails: any;
      };
    };
    strengths: string[];
    issues: any[];
    skipped?: boolean;
    skipReason?: string;
  };
  projectId: string;
  onIssueClick?: (issue: any) => void;
}

const DIMENSION_COLORS = {
  authority: '#8b5cf6',
  freshness: '#3b82f6',
  structure: '#10b981',
  brand: '#ef4444',
};

export function PageDetailsSection({ page, projectId, onIssueClick }: PageDetailsSectionProps) {
  // Show special message for skipped pages
  if (page.skipped) {
    return (
      <div className="p-4">
        <div className="bg-muted/50 border border-muted-foreground/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <span className="font-medium">Page Skipped</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {page.skipReason || "This page type is excluded from content analysis."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* AI Analysis Button */}
      <div className="flex justify-end">
        <LLMAnalysisModal 
          projectId={projectId} 
          pageUrl={page.url}
          trigger={
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              View AI Analysis Details
            </Button>
          }
        />
      </div>

      {/* LLM Analysis Details */}
      {page.details && <LLMAnalysisDetails details={page.details} />}

      {/* Score Calculation Details */}
      {(page.calculationDetails || page.ruleBasedAnalysis) && (
        <ScoreCalculationTable 
          calculationDetails={page.calculationDetails}
          ruleBasedAnalysis={page.ruleBasedAnalysis}
        />
      )}

      {/* Strengths */}
      {page.strengths.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Strengths
          </h4>
          <div className="flex flex-wrap gap-2">
            {page.strengths.map((strength, i) => (
              <Badge key={i} variant="success">
                {strength}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Issues by Dimension */}
      <IssuesByDimension issues={page.issues} onIssueClick={onIssueClick} />
    </div>
  );
}