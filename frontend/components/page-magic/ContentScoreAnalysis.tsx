'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ScoreData {
  technical: number;
  structure: number;
  authority: number;
  quality: number;
}

interface IterationData {
  iteration: number;
  globalScore: number;
  scores: ScoreData;
}

interface ContentScoreAnalysisProps {
  globalScore: number;
  scores: ScoreData;
  iterations?: IterationData[];
  issues?: Array<{
    dimension: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }>;
}

const SCORE_COLORS = {
  excellent: 'bg-accent/10 text-accent border-accent/20',
  good: 'bg-blue-100 text-blue-800 border-blue-200',
  average: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  poor: 'bg-red-100 text-red-800 border-red-200',
};

function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLORS.excellent;
  if (score >= 60) return SCORE_COLORS.good;
  if (score >= 40) return SCORE_COLORS.average;
  return SCORE_COLORS.poor;
}

function calculateScoreVariation(currentScore: number, previousScore: number) {
  const change = currentScore - previousScore;
  const changePercent = previousScore ? ((change / previousScore) * 100).toFixed(1) : '0';
  return {
    change,
    changePercent,
    isPositive: change > 0,
    hasChange: change !== 0
  };
}

export function ContentScoreAnalysis({ globalScore, scores, iterations, issues }: ContentScoreAnalysisProps) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const showVariations = iterations && iterations.length > 1;
  
  const getVariation = (currentScore: number, scoreType: 'global' | 'technical' | 'structure' | 'authority' | 'quality') => {
    if (!showVariations) return null;
    
    const firstIteration = iterations[0];
    const lastIteration = iterations[iterations.length - 1];
    
    let previousScore: number;
    if (scoreType === 'global') {
      previousScore = firstIteration.globalScore;
    } else {
      previousScore = firstIteration.scores[scoreType];
    }
    
    return calculateScoreVariation(currentScore, previousScore);
  };

  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    const timeout = setTimeout(() => {
      setIsTooltipOpen(true);
    }, 500); // 500ms delay before showing on hover
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    // Don't close immediately - let user move to tooltip content
    const timeout = setTimeout(() => {
      setIsTooltipOpen(false);
    }, 200);
    setHoverTimeout(timeout);
  };

  const handleClick = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setIsTooltipOpen(!isTooltipOpen);
  };

  const handleTooltipMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  };

  const handleTooltipMouseLeave = () => {
    setIsTooltipOpen(false);
  };

  const renderVariation = (variation: any) => {
    if (!variation || !variation.hasChange) return null;
    
    return (
      <div className={cn(
        "flex items-center justify-center gap-1 text-xs mt-1",
        variation.isPositive ? "text-accent" : "text-red-600"
      )}>
        {variation.isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {variation.isPositive ? '+' : ''}{variation.changePercent}%
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Content Score Analysis</CardTitle>
          {issues && issues.length > 0 && (
            <TooltipProvider>
              <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="destructive" 
                    className="cursor-pointer hover:bg-red-600"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                  >
                    {issues.length} issues
                  </Badge>
                </TooltipTrigger>
                <TooltipContent 
                  side="bottom" 
                  align="end" 
                  className="w-80 p-0"
                  onMouseEnter={handleTooltipMouseEnter}
                  onMouseLeave={handleTooltipMouseLeave}
                >
                  <div className="space-y-3 p-3">
                    <p className="font-semibold text-sm">Issues Found:</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {issues.map((issue, index) => (
                        <div key={index} className="text-sm border-l-2 pl-3 py-1" style={{
                          borderLeftColor: issue.severity === 'critical' ? '#ef4444' :
                                         issue.severity === 'high' ? '#f59e0b' :
                                         issue.severity === 'medium' ? '#eab308' :
                                         '#3b82f6'
                        }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-block w-2 h-2 rounded-full ${
                              issue.severity === 'critical' ? 'bg-red-500' :
                              issue.severity === 'high' ? 'bg-orange-500' :
                              issue.severity === 'medium' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`} />
                            <span className="capitalize font-medium text-xs">{issue.severity}</span>
                            <span className="text-xs text-muted-foreground">({issue.dimension})</span>
                          </div>
                          <p className="text-xs text-gray-700">{issue.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {/* Global Score */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Overall Score</div>
            <Badge className={`text-2xl px-4 py-2 ${getScoreColor(globalScore)}`}>
              {globalScore}
            </Badge>
            {renderVariation(getVariation(globalScore, 'global'))}
          </div>
          
          {/* Technical Score */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Technical</div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {scores.technical}
            </Badge>
            {renderVariation(getVariation(scores.technical, 'technical'))}
          </div>
          
          {/* Structure Score */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Structure</div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {scores.structure}
            </Badge>
            {renderVariation(getVariation(scores.structure, 'structure'))}
          </div>
          
          {/* Authority Score */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Authority</div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {scores.authority}
            </Badge>
            {renderVariation(getVariation(scores.authority, 'authority'))}
          </div>
          
          {/* Quality Score */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Quality</div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {scores.quality}
            </Badge>
            {renderVariation(getVariation(scores.quality, 'quality'))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}