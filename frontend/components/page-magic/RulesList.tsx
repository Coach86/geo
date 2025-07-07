'use client';

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, Settings } from 'lucide-react';

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
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  scoreBefore?: number;
  scoreAfter?: number;
  processingIndex?: number;
}

interface RulesListProps {
  rules: Rule[];
  currentProcessingIndex: number;
  totalRules: number;
  overallProgress: number;
  onRuleProcessingComplete?: (ruleIndex: number) => void;
}

export function RulesList({
  rules,
  currentProcessingIndex,
  totalRules,
  overallProgress,
  onRuleProcessingComplete,
}: RulesListProps) {
  const currentRuleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to currently processing rule with a slight delay for better UX
  useEffect(() => {
    if (currentProcessingIndex >= 0 && currentRuleRef.current) {
      // Add a small delay to make the transition more noticeable
      const scrollTimeout = setTimeout(() => {
        const container = currentRuleRef.current?.parentElement;
        if (container && currentRuleRef.current) {
          // Calculate the exact position to make the current rule the first visible item
          const ruleTop = currentRuleRef.current.offsetTop;
          container.scrollTo({
            top: ruleTop - 8, // 8px padding from the top
            behavior: 'smooth'
          });
        }
      }, 300); // 300ms delay after rule completion
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [currentProcessingIndex]);


  const getRuleStatus = (index: number, rule: Rule) => {
    if (rule.status) {
      console.log(`[RULE-STATUS] Rule ${index}: ${rule.status} (${rule.description?.substring(0, 30)}...)`);
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

  const completedRules = rules.filter((_, index) => index < currentProcessingIndex).length;
  const processingRule = currentProcessingIndex >= 0 && currentProcessingIndex < rules.length ? rules[currentProcessingIndex] : null;

  return (
    <Card className="h-[300px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Rules Processing
          </CardTitle>
          <Badge variant="outline" className="text-sm">
            {completedRules}/{totalRules} Complete
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 max-h-[200px] overflow-y-auto scroll-smooth relative">
        {rules.map((rule, index) => {
          const status = getRuleStatus(index, rule);
          const isCurrentRule = index === currentProcessingIndex;
          
          const getStatusIcon = () => {
            switch (status) {
              case 'completed':
                return <CheckCircle2 className="h-4 w-4 text-green-600" />;
              case 'processing':
                return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
              case 'retrying':
                return <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />;
              case 'failed':
                return <AlertCircle className="h-4 w-4 text-red-600" />;
              default:
                return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
            }
          };

          const displayScore = status === 'completed' && rule.scoreAfter !== undefined 
            ? rule.scoreAfter 
            : rule.currentScore;
          
          return (
            <div
              key={rule.id}
              ref={isCurrentRule ? currentRuleRef : undefined}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-500 ${
                isCurrentRule 
                  ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 shadow-md scale-[1.02]' 
                  : status === 'completed' 
                    ? 'bg-green-50/50 dark:bg-green-950/20 border border-transparent' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900 border border-transparent'
              }`}
            >
              {/* Status Icon */}
              {getStatusIcon()}
              
              {/* Rule Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                  {rule.ruleName || rule.description}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {status === 'retrying' && rule.retryCount && rule.maxRetries ? (
                    <span className="text-orange-600 animate-pulse">
                      Retrying... (attempt {rule.retryCount}/{rule.maxRetries})
                    </span>
                  ) : (
                    rule.recommendation
                  )}
                </div>
              </div>
              
              {/* Score */}
              <div className="text-right">
                <div className={`font-bold text-lg text-gray-900 dark:text-gray-100 transition-all duration-500 ${
                  status === 'completed' && rule.scoreAfter && rule.scoreAfter > rule.currentScore
                    ? 'animate-pulse' 
                    : ''
                }`}>
                  {displayScore}
                </div>
                {status === 'completed' && rule.scoreAfter !== undefined && rule.scoreBefore !== undefined && (
                  <div className={`text-xs transition-all duration-300 ${
                    rule.scoreAfter > rule.scoreBefore 
                      ? 'text-green-600 animate-in slide-in-from-top-2' 
                      : rule.scoreAfter < rule.scoreBefore 
                        ? 'text-red-600' 
                        : 'text-gray-500'
                  }`}>
                    {rule.scoreAfter > rule.scoreBefore ? '+' : ''}
                    {rule.scoreAfter - rule.scoreBefore}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {rules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No rules found to process</p>
            <p className="text-sm">All issues may already be resolved</p>
          </div>
        )}
        
        {/* Spacer to ensure last rules can scroll to top */}
        {rules.length > 0 && (
          <div className="h-[150px]" aria-hidden="true" />
        )}
      </CardContent>
    </Card>
  );
}