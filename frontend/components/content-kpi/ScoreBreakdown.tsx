'use client';

import React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';

interface SubScore {
  name: string;
  value: number;
  weight: number;
  maxValue: number;
  contribution: number;
  evidence?: string | string[];
}

interface DimensionDetails {
  formula: string;
  subScores: SubScore[];
  finalScore: number;
  explanation: string;
}

interface ScoreBreakdownProps {
  dimension: 'authority' | 'freshness' | 'structure' | 'brandAlignment';
  details: DimensionDetails;
  color: string;
  title: string;
}

export function ScoreBreakdown({ dimension, details, color, title }: ScoreBreakdownProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="font-medium text-sm" style={{ color }}>
          {title}
        </h5>
        <span className="text-sm font-semibold" style={{ color }}>
          {details.finalScore}/100
        </span>
      </div>
      
      <p className="text-sm font-mono">{details.formula}</p>
      
      <div className="space-y-2">
          {details.subScores.map((subScore, i) => (
            <Collapsible key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
                  <span className="text-sm font-medium">{subScore.name}:</span>
                  <span className="text-sm text-muted-foreground">
                    {subScore.value} / {subScore.maxValue}
                  </span>
                  {subScore.weight !== 0 && (
                    <span className="text-xs text-muted-foreground">
                      (weight: {Math.abs(subScore.weight * 100).toFixed(0)}%)
                    </span>
                  )}
                </CollapsibleTrigger>
                {subScore.weight !== 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          backgroundColor: color,
                          width: `${Math.max(0, Math.min(100, Math.abs(subScore.contribution / (Math.abs(subScore.weight) * 100)) * 100))}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {subScore.contribution >= 0 ? '+' : ''}{subScore.contribution.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              <CollapsibleContent className="ml-5 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                {subScore.evidence ? (
                  Array.isArray(subScore.evidence) ? (
                    <ul className="space-y-1">
                      {subScore.evidence.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <div>{subScore.evidence}</div>
                  )
                ) : (
                  <div className="italic text-muted-foreground">No evidence data</div>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
      </div>
      
      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          {details.explanation}
        </p>
      </div>
    </div>
  );
}