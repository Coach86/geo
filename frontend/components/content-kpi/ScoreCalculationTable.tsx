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
import { RuleDetailsDrawer } from './RuleDetailsDrawer';
import { DIMENSION_COLORS } from '@/lib/constants/colors';

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

interface ScoreCalculationTableProps {
  scores?: {
    technical: number;
    structure: number;
    authority: number;
    quality: number;
  };
  ruleResults: RuleResult[];
  pageUrl?: string;
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

const formatCategoryName = (category: string): string => {
  const categoryNames: Record<string, string> = {
    technical: 'Technical',
    structure: 'Structure',
    authority: 'Authority',
    quality: 'Quality',
  };
  return categoryNames[category] || category;
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
      <Table className="w-full h-full -ml-1">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[90px] text-xs h-8 py-2 text-center">Dimension</TableHead>
            <TableHead className="w-[300px] text-xs h-8 py-2">Rule</TableHead>
            <TableHead className="w-[140px] text-center text-xs h-8 py-2">Contribution</TableHead>
            <TableHead className="w-[60px] text-center text-xs h-8 py-2">Issues</TableHead>
            <TableHead className="w-[100px] text-center text-xs h-8 py-2">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ruleResults.map((rule) => {
            const hasEvidence = rule.evidence.length > 0;
            const hasIssues = rule.issues && rule.issues.length > 0;
            const hasEvidenceContent = hasEvidence || hasIssues;

            return (
              <TableRow key={rule.ruleId} className="hover:bg-transparent">
                <TableCell className="text-center">
                  <div 
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                    style={{ 
                      backgroundColor: `${DIMENSION_COLORS[rule.category]}15`,
                      color: DIMENSION_COLORS[rule.category],
                      border: `1px solid ${DIMENSION_COLORS[rule.category]}30`
                    }}
                  >
                    {formatCategoryName(rule.category)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm" title={rule.ruleName}>
                    {rule.ruleName}
                  </div>
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
                  {hasIssues ? (
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 font-semibold text-xs">
                      {rule.issues!.length}
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent/10 text-accent font-semibold text-xs">
                      0
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {hasEvidenceContent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEvidenceDrawer(rule)}
                      className="h-6 px-2 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View detail
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      <RuleDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={closeEvidenceDrawer}
        rule={selectedRule ? {
          ...selectedRule, 
          category: selectedRule.category === 'structure' ? 'content' : selectedRule.category as any,
          evidence: selectedRule.evidence.map(e => ({
            ...e,
            topic: e.content.substring(0, 50) // Add default topic from content
          }))
        } : null}
        pageUrl={pageUrl}
      />
    </>
  );
}