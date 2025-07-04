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
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  CheckCircle2,
  AlertCircle, 
  AlertTriangle,
  Info,
  XCircle,
  ArrowRightCircle,
  Copy,
  Check,
  TrendingUp,
  Activity,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EvidenceDrawer } from './EvidenceDrawer';

type EvidenceType = 
  | 'info'      // General information (default)
  | 'success'   // Success/passing items (✓)
  | 'warning'   // Warnings or minor issues (⚠)
  | 'error'     // Errors or failures (✗)
  | 'score'     // Score calculations
  | 'heading';  // Section headers

interface EvidenceItem {
  type: EvidenceType;
  content: string;
  target?: string;
  code?: string;
  score?: number;
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
  category: 'technical' | 'content' | 'authority' | 'monitoringKpi';
  score: number;
  maxScore: number;
  weight: number;
  contribution: number;
  passed: boolean;
  evidence: EvidenceItem[];
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

interface ScoreCalculationTableProps {
  scores?: {
    technical: number;
    content: number;
    authority: number;
    monitoringKpi: number;
  };
  ruleResults: RuleResult[];
  pageUrl?: string;
}

const DIMENSION_COLORS = {
  technical: '#8b5cf6',
  content: '#10b981',
  authority: '#3b82f6',
  monitoringKpi: '#ef4444',
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



export function ScoreCalculationTable({ scores, ruleResults, pageUrl }: ScoreCalculationTableProps) {
  const [selectedRule, setSelectedRule] = useState<RuleResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openEvidenceDrawer = (rule: RuleResult) => {
    setSelectedRule(rule);
    setIsDrawerOpen(true);
  };

  const closeEvidenceDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedRule(null);
  };

  // Group rules by dimension
  const rulesByDimension = ruleResults.reduce((acc, rule) => {
    if (!acc[rule.category]) {
      acc[rule.category] = [];
    }
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, RuleResult[]>);

  if (ruleResults.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No rule results available
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[30px]"></TableHead>
            <TableHead className="w-[90px]">Dimension</TableHead>
            <TableHead className="w-[180px]">Rule</TableHead>
            <TableHead className="w-[70px] text-center">Status</TableHead>
            <TableHead className="w-[140px] text-center">Contribution</TableHead>
            <TableHead className="w-[60px] text-center">Weight</TableHead>
            <TableHead className="w-[60px] text-center">Issues</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ruleResults.map((rule) => {
            const hasEvidence = rule.evidence.length > 0;
            const hasIssues = rule.issues && rule.issues.length > 0;
            const hasEvidenceContent = hasEvidence || hasIssues;

            return (
              <TableRow key={rule.ruleId}>
                <TableCell>
                  {hasEvidenceContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEvidenceDrawer(rule)}
                      title="View evidence"
                    >
                      <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </TableCell>
                    <TableCell>
                      <div 
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                        style={{ 
                          backgroundColor: `${DIMENSION_COLORS[rule.category]}15`,
                          color: DIMENSION_COLORS[rule.category],
                          border: `1px solid ${DIMENSION_COLORS[rule.category]}30`
                        }}
                      >
                        {rule.category}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm" title={rule.ruleName}>
                        {rule.ruleName}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {rule.passed ? (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Pass
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Fail
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ 
                              backgroundColor: rule.passed ? '#10b981' : '#ef4444',
                              width: `${Math.max(0, Math.min(100, (rule.score / rule.maxScore) * 100))}%` 
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1 min-w-[60px] justify-end">
                          <span className="font-medium text-sm">{rule.score}</span>
                          <span className="text-muted-foreground text-xs">/ {rule.maxScore}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium">
                        {rule.weight.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {hasIssues ? (
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold text-xs">
                          {rule.issues!.length}
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold text-xs">
                          0
                        </div>
                      )}
                    </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      <EvidenceDrawer
        isOpen={isDrawerOpen}
        onClose={closeEvidenceDrawer}
        rule={selectedRule}
        pageUrl={pageUrl}
      />
    </>
  );
}