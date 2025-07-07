'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImprovementIteration } from '@/hooks/usePageImprovement';

interface ImprovementProgressProps {
  currentIteration: number;
  maxIterations: number;
  progress: number;
  currentScore?: number;
  previousScore?: number;
  improvements: ImprovementIteration[];
  selectedIteration: number;
  onIterationSelect: (index: number) => void;
}

export function ImprovementProgress({
  currentIteration,
  maxIterations,
  progress,
  currentScore,
  previousScore,
  improvements,
  selectedIteration,
  onIterationSelect,
}: ImprovementProgressProps) {
  const scoreChange = currentScore && previousScore ? currentScore - previousScore : 0;
  const scoreChangePercent = previousScore ? ((scoreChange / previousScore) * 100).toFixed(1) : '0';

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Improvement Progress</h3>
            <p className="text-sm text-muted-foreground">
              Iteration {currentIteration} of {maxIterations}
            </p>
          </div>
          
          {currentScore !== undefined && (
            <div className="text-right">
              <div className="text-2xl font-bold">{currentScore}</div>
              <div className="flex items-center gap-1 text-sm">
                {scoreChange > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">+{scoreChangePercent}%</span>
                  </>
                ) : scoreChange < 0 ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">{scoreChangePercent}%</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No change</span>
                )}
              </div>
            </div>
          )}
        </div>
        
        <Progress value={progress} className="h-2" />
        
        {/* Iteration Selector */}
        {improvements.length > 0 && (
          <div className="flex gap-2">
            {improvements.map((imp, idx) => (
              <Button
                key={imp.iteration}
                variant={selectedIteration === idx ? "default" : "outline"}
                size="sm"
                onClick={() => onIterationSelect(idx)}
                className="flex items-center gap-2"
              >
                <span>v{imp.iteration}</span>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs",
                    imp.scoreAfter > imp.scoreBefore 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-800"
                  )}
                >
                  {imp.scoreAfter}
                </Badge>
              </Button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}