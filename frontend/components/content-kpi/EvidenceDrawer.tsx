'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle2,
  AlertCircle,
  Info,
  TrendingUp,
  Bot,
} from 'lucide-react';
import { EvidenceItemRenderer, type EvidenceItem } from './evidence/EvidenceItemRenderer';

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

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rule: RuleResult | null;
  pageUrl?: string;
}

const DIMENSION_COLORS = {
  technical: '#8b5cf6',
  content: '#10b981',
  authority: '#3b82f6',
  monitoringKpi: '#ef4444',
};

const SEVERITY_ICONS = {
  critical: AlertCircle,
  high: AlertCircle,
  medium: Info,
  low: Info,
};

const SEVERITY_COLORS = {
  critical: 'text-red-600 dark:text-red-500',
  high: 'text-orange-600 dark:text-orange-500',
  medium: 'text-yellow-600 dark:text-yellow-500',
  low: 'text-blue-600 dark:text-blue-500',
};

// AI-based rules that use LLM for analysis
const AI_BASED_RULES = [
  'case-studies',
  'citing-sources',
  'comparison-content',
  'definitional-content',
  'in-depth-guides'
];

export function EvidenceDrawer({ isOpen, onClose, rule, pageUrl }: EvidenceDrawerProps) {
  if (!rule) return null;

  // Separate score items from other evidence
  const scoreItems = rule.evidence.filter(item => item.type === 'score');
  const otherEvidence = rule.evidence.filter(item => item.type !== 'score');

  const hasIssues = rule.issues && rule.issues.length > 0;
  const percentage = (rule.score / rule.maxScore) * 100;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
                style={{ 
                  backgroundColor: `${DIMENSION_COLORS[rule.category]}15`,
                  color: DIMENSION_COLORS[rule.category],
                  border: `1px solid ${DIMENSION_COLORS[rule.category]}30`
                }}
              >
                {rule.category}
              </div>
              {rule.passed ? (
                <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Pass
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Fail
                </Badge>
              )}
            </div>
            {(rule.aiUsage || AI_BASED_RULES.includes(rule.ruleId)) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md text-xs text-purple-700 dark:text-purple-300 cursor-help">
                      <Bot className="h-3 w-3" />
                      <span>AI Analyzed</span>
                    </div>
                  </TooltipTrigger>
                  {rule.aiUsage && (
                    <TooltipContent side="bottom" align="end" className="max-w-lg p-3">
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-xs mb-1">Model:</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{rule.aiUsage.modelName}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-xs mb-1">Prompt:</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                            {rule.aiUsage.prompt.length > 500 
                              ? rule.aiUsage.prompt.substring(0, 500) + '...' 
                              : rule.aiUsage.prompt}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-xs mb-1">Response:</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                            {rule.aiUsage.response.length > 500 
                              ? rule.aiUsage.response.substring(0, 500) + '...' 
                              : rule.aiUsage.response}
                          </p>
                        </div>
                      </div>
                    </TooltipContent>
                  )}
                  {!rule.aiUsage && (
                    <TooltipContent>
                      <p className="text-xs">This rule uses AI for analysis</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <SheetTitle className="text-left">
            <div className="space-y-1">
              <div>{rule.ruleName}</div>
              {pageUrl && (
                <div className="text-sm font-normal text-muted-foreground truncate">
                  {pageUrl}
                </div>
              )}
            </div>
          </SheetTitle>
          <SheetDescription className="text-left">
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{rule.score}</span>
                <span className="text-muted-foreground text-xs">/ {rule.maxScore}</span>
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2 relative max-w-32">
                <div 
                  className="h-2 rounded-full transition-all"
                  style={{ 
                    backgroundColor: rule.passed ? '#10b981' : '#ef4444',
                    width: `${Math.max(0, Math.min(100, percentage))}%` 
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                Weight: {rule.weight.toFixed(1)}
              </span>
            </div>
          </SheetDescription>
        </SheetHeader>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto mt-6 pb-4">
          <div className="space-y-4">
            {/* Evidence Section */}
            {otherEvidence.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  Evidence ({otherEvidence.length})
                </h5>
                {otherEvidence.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <EvidenceItemRenderer item={item} />
                    {idx < otherEvidence.length - 1 && (
                      <div className="border-t border-gray-100 dark:border-gray-800 my-2" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Issues Section */}
            {hasIssues && (
              <div className="mt-6">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  Issues Found ({rule.issues!.length})
                </h5>
                <div className="space-y-2">
                  {rule.issues!.map((issue, idx) => {
                    const Icon = SEVERITY_ICONS[issue.severity];
                    
                    return (
                      <div 
                        key={idx} 
                        className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 py-2"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${SEVERITY_COLORS[issue.severity]}`} />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-4">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {issue.description}
                              </p>
                              <span className={`text-xs font-medium ${SEVERITY_COLORS[issue.severity]}`}>
                                {issue.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {issue.recommendation}
                            </p>
                            {issue.affectedElements && issue.affectedElements.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {issue.affectedElements.map((elem, i) => (
                                  <code 
                                    key={i}
                                    className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded"
                                  >
                                    {elem}
                                  </code>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Score Computation at Bottom */}
        {scoreItems.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 bg-background">
            {scoreItems.map((item, idx) => (
              <EvidenceItemRenderer key={idx} item={item} />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}