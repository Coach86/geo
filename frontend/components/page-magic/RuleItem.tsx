'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Target, 
  Settings, 
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { Rule } from './RulesList';

interface RuleItemProps {
  rule: Rule;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  index: number;
  totalRules: number;
  isProcessing?: boolean;
  onProcessingComplete?: () => void;
}

export function RuleItem({
  rule,
  status,
  index,
  totalRules,
  isProcessing = false,
  onProcessingComplete,
}: RuleItemProps) {
  const [animatedScore, setAnimatedScore] = useState(rule.currentScore);
  const [showScoreAnimation, setShowScoreAnimation] = useState(false);

  // Animate score changes
  useEffect(() => {
    if (status === 'completed' && rule.scoreAfter !== undefined && rule.scoreBefore !== undefined) {
      setShowScoreAnimation(true);
      
      // Animate from scoreBefore to scoreAfter
      const duration = 1500; // 1.5 seconds
      const startTime = Date.now();
      const startScore = rule.scoreBefore;
      const endScore = rule.scoreAfter;
      const scoreChange = endScore - startScore;

      const animateScore = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentScore = startScore + (scoreChange * easeOut);
        
        setAnimatedScore(Math.round(currentScore));
        
        if (progress < 1) {
          requestAnimationFrame(animateScore);
        } else {
          setShowScoreAnimation(false);
          onProcessingComplete?.();
        }
      };
      
      requestAnimationFrame(animateScore);
    }
  }, [status, rule.scoreAfter, rule.scoreBefore, onProcessingComplete]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDimensionIcon = (dimension: string) => {
    switch (dimension) {
      case 'content':
        return <Target className="h-4 w-4" />;
      case 'structure':
        return <Settings className="h-4 w-4" />;
      case 'authority':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-accent" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getScoreChangeIcon = () => {
    if (!rule.scoreAfter || !rule.scoreBefore) return null;
    
    const change = rule.scoreAfter - rule.scoreBefore;
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-accent" />;
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getScoreChangeColor = () => {
    if (!rule.scoreAfter || !rule.scoreBefore) return 'text-gray-600';
    
    const change = rule.scoreAfter - rule.scoreBefore;
    if (change > 0) {
      return 'text-accent';
    } else if (change < 0) {
      return 'text-red-600';
    } else {
      return 'text-gray-600';
    }
  };

  return (
    <Card className={`transition-all duration-300 ${
      isProcessing ? 'shadow-md border-blue-200' : ''
    } ${status === 'completed' ? 'bg-accent/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Status Icon and Index */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium text-muted-foreground">
                {index}/{totalRules}
              </span>
            </div>

            {/* Rule Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={getSeverityColor(rule.severity)} variant="outline">
                  {rule.severity}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getDimensionIcon(rule.dimension)}
                  {rule.dimension}
                </Badge>
              </div>
              
              <h4 className="font-medium text-sm leading-tight mb-1 text-gray-900">
                {rule.ruleName || rule.description}
              </h4>
              
              <p className="text-xs text-gray-600 leading-relaxed">
                {rule.recommendation}
              </p>
            </div>
          </div>

          {/* Score Display */}
          <div className="flex flex-col items-end gap-1 min-w-0">
            <div className={`text-lg font-bold transition-all duration-300 ${
              showScoreAnimation ? 'scale-110' : 'scale-100'
            }`}>
              {animatedScore}
            </div>
            
            {/* Score Change Indicator */}
            {status === 'completed' && rule.scoreAfter !== undefined && rule.scoreBefore !== undefined && (
              <div className={`flex items-center gap-1 text-xs ${getScoreChangeColor()}`}>
                {getScoreChangeIcon()}
                <span>
                  {rule.scoreAfter > rule.scoreBefore ? '+' : ''}
                  {rule.scoreAfter - rule.scoreBefore}
                </span>
              </div>
            )}
            
            {/* Processing Progress for Current Rule */}
            {isProcessing && (
              <div className="w-16">
                <Progress value={undefined} className="h-1" />
              </div>
            )}
          </div>
        </div>

        {/* Processing Details */}
        {isProcessing && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Analyzing and improving content...</span>
            </div>
          </div>
        )}

        {/* Completed Details */}
        {status === 'completed' && rule.scoreAfter !== undefined && (
          <div className="mt-3 pt-3 border-t border-accent/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-accent">
                Rule processed successfully
              </span>
              <span className="text-xs text-muted-foreground">
                {rule.scoreBefore} → {rule.scoreAfter}
              </span>
            </div>
          </div>
        )}

        {/* Failed Details */}
        {status === 'failed' && (
          <div className="mt-3 pt-3 border-t border-red-200">
            <div className="text-sm text-red-700">
              Processing failed - will continue with next rule
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}