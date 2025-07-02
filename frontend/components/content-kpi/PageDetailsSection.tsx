'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LLMAnalysisModal } from './LLMAnalysisModal';
import { LLMAnalysisDetails } from './LLMAnalysisDetails';
import { ScoreBreakdown } from './ScoreBreakdown';
import { RuleBasedScoreBreakdown } from './RuleBasedScoreBreakdown';
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
  };
  projectId: string;
}

const DIMENSION_COLORS = {
  authority: '#8b5cf6',
  freshness: '#3b82f6',
  structure: '#10b981',
  brand: '#ef4444',
};

export function PageDetailsSection({ page, projectId }: PageDetailsSectionProps) {
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
      {page.calculationDetails && (
        <div className="space-y-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            Score Calculation Details
          </h4>
          
          {/* Authority Calculation */}
          {page.ruleBasedAnalysis?.authority?.calculationDetails ? (
            <RuleBasedScoreBreakdown
              dimension="authority"
              details={page.ruleBasedAnalysis.authority.calculationDetails}
              color={DIMENSION_COLORS.authority}
              title="Authority Score Breakdown"
            />
          ) : page.calculationDetails.authority ? (
            <ScoreBreakdown
              dimension="authority"
              details={page.calculationDetails.authority}
              color={DIMENSION_COLORS.authority}
              title="Authority Score Breakdown"
            />
          ) : null}

          {/* Freshness Calculation */}
          {page.ruleBasedAnalysis?.freshness?.calculationDetails ? (
            <RuleBasedScoreBreakdown
              dimension="freshness"
              details={page.ruleBasedAnalysis.freshness.calculationDetails}
              color={DIMENSION_COLORS.freshness}
              title="Freshness Score Breakdown"
            />
          ) : page.calculationDetails.freshness ? (
            <ScoreBreakdown
              dimension="freshness"
              details={page.calculationDetails.freshness}
              color={DIMENSION_COLORS.freshness}
              title="Freshness Score Breakdown"
            />
          ) : null}

          {/* Structure Calculation */}
          {page.calculationDetails.structure && (
            <ScoreBreakdown
              dimension="structure"
              details={page.calculationDetails.structure}
              color={DIMENSION_COLORS.structure}
              title="Structure Score Breakdown"
            />
          )}


          {/* Brand Calculation */}
          {page.calculationDetails.brandAlignment && (
            <ScoreBreakdown
              dimension="brandAlignment"
              details={page.calculationDetails.brandAlignment}
              color={DIMENSION_COLORS.brand}
              title="Brand Score Breakdown"
            />
          )}
        </div>
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
      <IssuesByDimension issues={page.issues} />
    </div>
  );
}