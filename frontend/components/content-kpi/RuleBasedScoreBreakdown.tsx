'use client';

import React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

interface RuleBasedDetails {
  formula?: string;
  ruleResults: RuleResult[];
  finalScore: number;
  explanation?: string;
  dimensionWeight?: number;
}

interface RuleBasedScoreBreakdownProps {
  dimension: string;
  details: RuleBasedDetails;
  color: string;
  title: string;
}

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

export function RuleBasedScoreBreakdown({ dimension, details, color, title }: RuleBasedScoreBreakdownProps) {
  const totalIssues = details.ruleResults.reduce((sum, rule) => sum + (rule.issues?.length || 0), 0);
  
  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="font-medium text-sm flex items-center gap-2" style={{ color }}>
          {title}
          <Badge variant="secondary" className="text-xs">
            Rule-Based
          </Badge>
        </h5>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold" style={{ color }}>
            {details.finalScore.toFixed(0)}
          </span>
          {totalIssues > 0 && (
            <Badge variant="outline" className="text-xs">
              {totalIssues} issue{totalIssues !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>
      
      {details.formula && (
        <p className="text-sm font-mono text-muted-foreground">{details.formula}</p>
      )}
      
      <div className="space-y-2">
        {details.ruleResults.map((rule, i) => (
          <Collapsible key={i} className="space-y-2">
            <div className="flex items-center justify-between bg-background/50 rounded-lg p-2">
              <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-1">
                <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
                <span className="text-sm font-medium">{rule.ruleName}</span>
                <span className="text-xs text-muted-foreground">
                  ({rule.score} / {rule.maxScore})
                </span>
                {rule.weight > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {(rule.weight * 100).toFixed(0)}%
                  </Badge>
                )}
                {rule.issues && rule.issues.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {rule.issues.length} issue{rule.issues.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </CollapsibleTrigger>
              
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all"
                    style={{ 
                      backgroundColor: color,
                      width: `${(rule.score / rule.maxScore) * 100}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-medium min-w-[3rem] text-right">
                  +{rule.contribution.toFixed(1)}
                </span>
              </div>
            </div>
            
            <CollapsibleContent className="ml-5 space-y-3">
              {/* Evidence */}
              {rule.evidence && rule.evidence.length > 0 && (
                <div className="bg-muted/30 p-3 rounded space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Evidence:</p>
                  <ul className="space-y-1">
                    {rule.evidence.map((item, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Issues */}
              {rule.issues && rule.issues.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Issues found:</p>
                  {rule.issues.map((issue, idx) => {
                    const Icon = SEVERITY_ICONS[issue.severity];
                    return (
                      <div key={idx} className="bg-background/50 p-3 rounded space-y-1 border border-border/50">
                        <div className="flex items-start gap-2">
                          <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${SEVERITY_COLORS[issue.severity]}`} />
                          <div className="space-y-1 flex-1">
                            <p className="text-xs font-medium">{issue.description}</p>
                            <p className="text-xs text-muted-foreground">
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
              )}
              
              {/* Additional Details */}
              {rule.details && Object.keys(rule.details).length > 0 && (
                <div className="bg-muted/30 p-3 rounded">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Details:</p>
                  <div className="space-y-1">
                    {Object.entries(rule.details).map(([key, value]) => (
                      <div key={key} className="text-xs text-muted-foreground">
                        <span className="font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
      
      {details.explanation && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {details.explanation}
          </p>
        </div>
      )}
    </div>
  );
}