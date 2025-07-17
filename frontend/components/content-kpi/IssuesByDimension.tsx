'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Info 
} from 'lucide-react';

interface PageIssue {
  dimension: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation?: string;
}

interface IssuesByDimensionProps {
  issues: PageIssue[];
  onIssueClick?: (issue: PageIssue) => void;
}

const DIMENSION_COLORS = {
  authority: '#8b5cf6',
  freshness: '#3b82f6',
  structure: '#10b981',
  brand: '#ef4444',
};

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const SEVERITY_ICONS = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Info,
  low: CheckCircle,
};

export function IssuesByDimension({ issues, onIssueClick }: IssuesByDimensionProps) {
  // Group issues by dimension
  const issuesByDimension = issues.reduce((acc, issue) => {
    if (!acc[issue.dimension]) {
      acc[issue.dimension] = [];
    }
    acc[issue.dimension].push(issue);
    return acc;
  }, {} as Record<string, PageIssue[]>);

  // Sort issues within each dimension by severity (critical -> high -> medium -> low)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  Object.keys(issuesByDimension).forEach(dimension => {
    issuesByDimension[dimension].sort((a, b) => {
      const severityA = severityOrder[a.severity];
      const severityB = severityOrder[b.severity];
      return severityA - severityB;
    });
  });

  if (Object.keys(issuesByDimension).length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
        <p>No issues found - this page is well optimized!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {Object.entries(issuesByDimension).map(([dimension, dimensionIssues]) => (
          <div key={dimension} className="border rounded-lg p-3">
            <h5 
              className="font-medium capitalize mb-2" 
              style={{ color: DIMENSION_COLORS[dimension.toLowerCase() as keyof typeof DIMENSION_COLORS] }}
            >
              {dimension}
            </h5>
            <div className="space-y-2">
              {dimensionIssues.map((issue, i) => {
                const Icon = SEVERITY_ICONS[issue.severity];
                return (
                  <div 
                    key={i} 
                    className={`flex items-start gap-2 ${onIssueClick ? 'cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded' : ''}`}
                    onClick={() => onIssueClick?.(issue)}
                  >
                    <Icon 
                      className="h-4 w-4 mt-0.5" 
                      style={{ color: SEVERITY_COLORS[issue.severity] }}
                    />
                    <div className="flex-1">
                      <p className="text-sm">{issue.description}</p>
                      {issue.recommendation && (
                        <p className="text-xs text-muted-foreground mt-1">
                          → {issue.recommendation}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: SEVERITY_COLORS[issue.severity],
                        color: SEVERITY_COLORS[issue.severity],
                      }}
                    >
                      {issue.severity}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}