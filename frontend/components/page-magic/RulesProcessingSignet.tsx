'use client';

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Rule {
  id: string;
  ruleId?: string;
  ruleName?: string;
  dimension: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  currentScore: number;
  affectedElements?: string[];
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  scoreBefore?: number;
  scoreAfter?: number;
  processingIndex?: number;
  retryCount?: number;
  maxRetries?: number;
}

interface RulesProcessingSignetProps {
  rules: Rule[];
  currentProcessingIndex: number;
  totalRules: number;
  overallProgress: number;
  className?: string;
}

export function RulesProcessingSignet({
  rules,
  currentProcessingIndex,
  totalRules,
  overallProgress,
  className
}: RulesProcessingSignetProps) {
  const currentRuleRef = useRef<HTMLDivElement>(null);
  const completedRules = rules.filter((_, index) => index < currentProcessingIndex).length;

  // Auto-scroll to currently processing rule
  useEffect(() => {
    if (currentProcessingIndex >= 0 && currentRuleRef.current) {
      const scrollTimeout = setTimeout(() => {
        const container = currentRuleRef.current?.parentElement;
        if (container && currentRuleRef.current) {
          const ruleTop = currentRuleRef.current.offsetTop;
          container.scrollTo({
            top: ruleTop - 4,
            behavior: 'smooth'
          });
        }
      }, 300);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [currentProcessingIndex]);

  const getRuleStatus = (index: number, rule: Rule) => {
    if (rule.status) {
      return rule.status;
    }
    
    if (index < currentProcessingIndex) {
      return 'completed';
    } else if (index === currentProcessingIndex) {
      return 'processing';
    } else {
      return 'pending';
    }
  };

  const currentRule = currentProcessingIndex >= 0 && currentProcessingIndex < rules.length 
    ? rules[currentProcessingIndex] 
    : null;
  const currentStatus = currentRule ? getRuleStatus(currentProcessingIndex, currentRule) : 'pending';

  return (
    <Card className={cn(
      "fixed top-4 right-4 w-[400px] shadow-lg z-50",
      className
    )}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4" />
            Rules Processing
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {completedRules}/{totalRules}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0">
        {currentRule ? (
          <div className="flex items-center gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            {/* Status Icon */}
            {(() => {
              switch (currentStatus) {
                case 'completed':
                  return <CheckCircle2 className="h-3 w-3 text-green-600" />;
                case 'processing':
                  return <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />;
                case 'retrying':
                  return <Loader2 className="h-3 w-3 text-orange-600 animate-spin" />;
                case 'failed':
                  return <AlertCircle className="h-3 w-3 text-red-600" />;
                default:
                  return <div className="h-3 w-3 rounded-full border border-gray-300" />;
              }
            })()}
            
            {/* Rule Info */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                {currentRule.ruleName || currentRule.description}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                {currentStatus === 'retrying' && currentRule.retryCount && currentRule.maxRetries ? (
                  <span className="text-orange-600 animate-pulse">
                    Retry {currentRule.retryCount}/{currentRule.maxRetries}
                  </span>
                ) : (
                  currentRule.recommendation
                )}
              </div>
            </div>
            
            {/* Score */}
            <div className="text-right">
              <div className={`font-bold text-sm text-gray-900 dark:text-gray-100 ${
                currentStatus === 'completed' && currentRule.scoreAfter && currentRule.scoreAfter > currentRule.currentScore
                  ? 'animate-pulse' 
                  : ''
              }`}>
                {currentStatus === 'completed' && currentRule.scoreAfter !== undefined 
                  ? currentRule.scoreAfter 
                  : currentRule.currentScore}
              </div>
              {currentStatus === 'completed' && currentRule.scoreAfter !== undefined && currentRule.scoreBefore !== undefined && (
                <div className={`text-[10px] ${
                  currentRule.scoreAfter > currentRule.scoreBefore 
                    ? 'text-green-600' 
                    : currentRule.scoreAfter < currentRule.scoreBefore 
                      ? 'text-red-600' 
                      : 'text-gray-500'
                }`}>
                  {currentRule.scoreAfter > currentRule.scoreBefore ? '+' : ''}
                  {currentRule.scoreAfter - currentRule.scoreBefore}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-2 text-xs text-muted-foreground">
            {rules.length === 0 ? (
              <>
                <AlertCircle className="h-4 w-4 mx-auto mb-1" />
                <p>No rules found</p>
              </>
            ) : (
              <p>Processing complete</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}