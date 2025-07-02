'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface SubScore {
  name: string;
  value: number;
  weight: number;
  maxValue: number;
  contribution: number;
  evidence?: string | string[];
}

interface RuleResult {
  ruleId: string;
  ruleName: string;
  score: number;
  maxScore: number;
  contribution: number;
  weight: number;
  evidence: string[];
  details?: any;
  issues?: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
}

interface DimensionDetails {
  formula: string;
  subScores: SubScore[];
  finalScore: number;
  explanation: string;
}

interface RuleBasedDetails {
  formula?: string;
  ruleResults: RuleResult[];
  finalScore: number;
  explanation?: string;
  dimensionWeight?: number;
}

interface ScoreCalculationTableProps {
  calculationDetails: {
    authority?: DimensionDetails;
    freshness?: DimensionDetails;
    structure?: DimensionDetails;
    brandAlignment?: DimensionDetails;
  };
  ruleBasedAnalysis?: {
    authority?: {
      calculationDetails: RuleBasedDetails;
    };
    freshness?: {
      calculationDetails: RuleBasedDetails;
    };
    structure?: {
      calculationDetails: RuleBasedDetails;
    };
    brand?: {
      calculationDetails: RuleBasedDetails;
    };
  };
}

const DIMENSION_COLORS = {
  authority: '#8b5cf6',
  freshness: '#3b82f6',
  structure: '#10b981',
  brand: '#ef4444',
};

const SEVERITY_COLORS = {
  critical: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-yellow-600',
  low: 'text-blue-600',
};

const SEVERITY_ICONS = {
  critical: AlertCircle,
  high: AlertCircle,
  medium: Info,
  low: Info,
};

export function ScoreCalculationTable({ calculationDetails, ruleBasedAnalysis }: ScoreCalculationTableProps) {
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(new Set());

  const toggleIndicator = (key: string) => {
    const newExpanded = new Set(expandedIndicators);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedIndicators(newExpanded);
  };

  // Collect all indicators from both calculation types
  const indicators: Array<{
    key: string;
    dimension: string;
    name: string;
    score: number;
    maxScore: number;
    weight: number;
    contribution: number;
    color: string;
    evidence: string[];
    issues?: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
    }>;
    type: 'rule-based' | 'llm-based';
  }> = [];

  // Add LLM-based indicators
  Object.entries(calculationDetails || {}).forEach(([dimension, details]) => {
    if (details && details.subScores && Array.isArray(details.subScores)) {
      details.subScores.forEach((subScore, index) => {
        const key = `${dimension}-${index}`;
        indicators.push({
          key,
          dimension,
          name: subScore.name,
          score: subScore.value,
          maxScore: subScore.maxValue,
          weight: subScore.weight,
          contribution: subScore.contribution,
          color: DIMENSION_COLORS[dimension as keyof typeof DIMENSION_COLORS] || '#6b7280',
          evidence: Array.isArray(subScore.evidence) 
            ? subScore.evidence 
            : subScore.evidence 
              ? [subScore.evidence] 
              : [],
          type: 'llm-based',
        });
      });
    }
  });

  // Add rule-based indicators
  Object.entries(ruleBasedAnalysis || {}).forEach(([dimension, analysis]) => {
    if (analysis?.calculationDetails) {
      analysis.calculationDetails.ruleResults.forEach((rule, index) => {
        const key = `${dimension}-rule-${index}`;
        const dimColor = dimension === 'brand' ? 'brand' : dimension;
        indicators.push({
          key,
          dimension,
          name: rule.ruleName,
          score: rule.score,
          maxScore: rule.maxScore,
          weight: rule.weight,
          contribution: rule.contribution,
          color: DIMENSION_COLORS[dimColor as keyof typeof DIMENSION_COLORS] || '#6b7280',
          evidence: rule.evidence || [],
          issues: rule.issues,
          type: 'rule-based',
        });
      });
    }
  });

  if (indicators.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No score calculation details available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm flex items-center gap-2">
        <Info className="h-4 w-4 text-blue-600" />
        Score Calculation Details
      </h4>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[30px]"></TableHead>
              <TableHead className="w-[90px]">Dimension</TableHead>
              <TableHead className="w-[120px]">Indicator</TableHead>
              <TableHead className="w-[70px] text-center">Score</TableHead>
              <TableHead className="w-[70px] text-center">Weight</TableHead>
              <TableHead className="w-[100px] text-center">Contribution</TableHead>
              <TableHead className="w-[60px] text-center">Issues</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {indicators.map((indicator) => {
              const isExpanded = expandedIndicators.has(indicator.key);
              const hasEvidence = indicator.evidence.length > 0;
              const hasIssues = indicator.issues && indicator.issues.length > 0;
              const hasExpandableContent = hasEvidence || hasIssues;

              return (
                <React.Fragment key={indicator.key}>
                  <TableRow 
                    className={hasExpandableContent ? "cursor-pointer hover:bg-muted/30" : ""}
                    onClick={hasExpandableContent ? () => toggleIndicator(indicator.key) : undefined}
                  >
                    <TableCell>
                      {hasExpandableContent && (
                        <ChevronRight 
                          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          borderColor: indicator.color,
                          color: indicator.color 
                        }}
                      >
                        {indicator.dimension}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm truncate" title={indicator.name}>
                        {indicator.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-medium">{indicator.score}</span>
                        <span className="text-muted-foreground text-xs">/ {indicator.maxScore}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {indicator.weight !== 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.abs(indicator.weight * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full transition-all"
                            style={{ 
                              backgroundColor: indicator.color,
                              width: `${Math.max(0, Math.min(100, Math.abs(indicator.contribution / (Math.abs(indicator.weight) * 100)) * 100))}%` 
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium min-w-[2.5rem]">
                          {indicator.contribution >= 0 ? '+' : ''}{indicator.contribution.toFixed(1)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {hasIssues ? (
                        <Badge variant="destructive" className="text-xs">
                          {indicator.issues!.length}
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-xs">
                          0
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>

                  {isExpanded && hasExpandableContent && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/20 p-4">
                        <div className="space-y-4">
                          {/* Evidence Section */}
                          {hasEvidence && (
                            <div>
                              <h6 className="text-sm font-medium mb-2">
                                Evidence
                              </h6>
                              <div className="bg-background/50 rounded p-3">
                                <ul className="space-y-1">
                                  {indicator.evidence.map((item, idx) => (
                                    <li key={idx} className="text-sm text-muted-foreground">
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          {/* Issues Section */}
                          {hasIssues && (
                            <div>
                              <h6 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                Issues Found
                              </h6>
                              <div className="space-y-2">
                                {indicator.issues!.map((issue, idx) => {
                                  const Icon = SEVERITY_ICONS[issue.severity];
                                  return (
                                    <div key={idx} className="bg-background/50 p-3 rounded border border-border/50">
                                      <div className="flex items-start gap-2">
                                        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${SEVERITY_COLORS[issue.severity]}`} />
                                        <div className="space-y-1 flex-1">
                                          <p className="text-sm font-medium">{issue.description}</p>
                                          <p className="text-sm text-muted-foreground">
                                            <span className="font-medium">Recommendation:</span> {issue.recommendation}
                                          </p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          {issue.severity}
                                        </Badge>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}