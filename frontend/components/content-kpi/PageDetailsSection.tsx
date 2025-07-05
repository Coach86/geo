'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LLMAnalysisModal } from './LLMAnalysisModal';
import { LLMAnalysisDetails } from './LLMAnalysisDetails';
import { ScoreCalculationTable } from './ScoreCalculationTable';
import { IssuesByDimension } from './IssuesByDimension';
import { Sparkles, Info, CheckCircle, Lightbulb } from 'lucide-react';

interface EvidenceItem {
  type: 'info' | 'success' | 'warning' | 'error' | 'score' | 'heading';
  content: string;
  target?: string;
  code?: string;
  score?: number;
  maxScore?: number;
  metadata?: Record<string, any>;
}

interface AIUsage {
  modelName: string;
  prompt: string;
  response: string;
}

interface RuleResult {
  ruleId: string;
  ruleName: string;
  category: 'technical' | 'structure' | 'authority' | 'quality';
  score: number;
  maxScore: number;
  weight: number;
  contribution: number;
  passed: boolean;
  evidence: EvidenceItem[];
  recommendations?: string[];
  issues?: Array<{
    dimension: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
    affectedElements?: string[];
  }>;
  details?: Record<string, any>;
  aiUsage?: AIUsage;
}

interface Recommendation {
  content: string;
  ruleId: string;
  ruleCategory: string;
}

interface PageDetailsSectionProps {
  page: {
    url: string;
    details?: any;
    scores?: {
      technical: number;
      structure: number;
      authority: number;
      quality: number;
    };
    globalScore?: number;
    ruleResults?: RuleResult[];
    recommendations?: string[] | Recommendation[];
    issues: any[];
    skipped?: boolean;
    skipReason?: string;
  };
  projectId: string;
  onIssueClick?: (issue: any) => void;
}

const DIMENSION_COLORS = {
  technical: '#8b5cf6',
  structure: '#10b981',
  authority: '#3b82f6',
  quality: '#ef4444',
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
      {/* LLM Analysis Details */}
      {page.details && <LLMAnalysisDetails details={page.details} />}

      {/* Score Calculation Details */}
      {page.ruleResults && page.ruleResults.length > 0 && (
        <ScoreCalculationTable 
          scores={page.scores}
          ruleResults={page.ruleResults}
          pageUrl={page.url}
        />
      )}

      {/* Recommendations */}
      {page.recommendations && page.recommendations.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-600" />
            Recommendations
          </h4>
          <div className="space-y-3">
            {page.recommendations.map((recommendation, i) => {
              const isObject = typeof recommendation === 'object' && recommendation !== null;
              const content = isObject ? (recommendation as Recommendation).content : recommendation;
              const category = isObject ? (recommendation as Recommendation).ruleCategory : null;
              const ruleId = isObject ? (recommendation as Recommendation).ruleId : null;
              
              return (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <div className="flex-1">
                    <span className="text-muted-foreground">{content}</span>
                    {isObject && (
                      <div className="flex gap-2 mt-1">
                        {category && (
                          <Badge 
                            variant="outline" 
                            className="text-xs" 
                            style={{ 
                              borderColor: DIMENSION_COLORS[category.toLowerCase() as keyof typeof DIMENSION_COLORS],
                              color: DIMENSION_COLORS[category.toLowerCase() as keyof typeof DIMENSION_COLORS]
                            }}
                          >
                            {category}
                          </Badge>
                        )}
                        {ruleId && (
                          <span className="text-xs text-muted-foreground/60">
                            {ruleId.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Issues by Dimension */}
      <IssuesByDimension issues={page.issues} onIssueClick={onIssueClick} />
    </div>
  );
}