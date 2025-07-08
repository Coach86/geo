'use client';

import React from 'react';
import { ScoreBadge } from './ScoreBadge';
import { CodeBlock } from './CodeBlock';
import { EVIDENCE_TYPE_CONFIG } from './evidenceConfig';
import { Target } from 'lucide-react';

export type EvidenceType = 
  | 'info'      // General information (default)
  | 'success'   // Success/passing items (✓)
  | 'warning'   // Warnings or minor issues (⚠)
  | 'error'     // Errors or failures (✗)
  | 'score'     // Score calculations
  | 'heading'   // Section headers
  | 'base';     // Base score evidence

export interface EvidenceItem {
  type: EvidenceType;
  topic: string;
  content: string;
  target?: string;
  code?: string;
  score?: number;
  maxScore?: number;
  metadata?: Record<string, any>;
}

interface EvidenceItemRendererProps {
  item: EvidenceItem;
}

export function EvidenceItemRenderer({ item }: EvidenceItemRendererProps) {
  const { type, content } = item;

  // Special case for headings
  if (type === 'heading') {
    return (
      <div className="mt-4 mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {content}
        </h4>
      </div>
    );
  }

  // Special case for base score
  if (type === 'base') {
    return (
      <div className="group hover:bg-gray-50/50 rounded-lg transition-colors">
        <div className="flex items-start gap-3 p-3 -m-1">
          {/* Blue dot bullet - aligned with icons */}
          <div className="pt-0.5">
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
            </div>
          </div>
          
          {/* Content column */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-gray-900">
                  Base Score
                </h4>
              </div>
              <div className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 bg-blue-100 border border-blue-300 rounded text-xs font-semibold text-blue-700">
                {item.score}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Special case for score calculations
  if (type === 'score') {
    const finalScoreMatch = content.match(/=\s*(\d+)\/(\d+)$/);
    let finalScore = 0;
    let maxScore = 100;
    let percentage = 0;
    
    if (finalScoreMatch) {
      finalScore = parseInt(finalScoreMatch[1]);
      maxScore = parseInt(finalScoreMatch[2]);
      percentage = (finalScore / maxScore) * 100;
    }
    
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="space-y-3">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Score Calculation
          </h5>
          <div className="font-mono text-xs text-gray-600 leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    );
  }

  // Handle regular evidence types (success, error, warning, info)
  const config = EVIDENCE_TYPE_CONFIG[type as keyof typeof EVIDENCE_TYPE_CONFIG] || EVIDENCE_TYPE_CONFIG.info;
  const Icon = config.icon;

  return (
    <div className="group hover:bg-gray-50/50 rounded-lg transition-colors">
      <div className="flex items-start gap-3 p-3 -m-1">
        {/* Icon column */}
        <div className="pt-0.5">
          <Icon className={`h-4 w-4 ${config.iconColor} flex-shrink-0`} />
        </div>
        
        {/* Content column */}
        <div className="flex-1 min-w-0">
          {/* Topic and Score row */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex-1">
              {item.topic && (
                <h4 className="font-semibold text-sm text-gray-900">
                  {item.topic}
                </h4>
              )}
            </div>
            {item.score !== undefined && <ScoreBadge score={item.score} maxScore={item.maxScore} />}
          </div>
          
          {/* Content */}
          <p className={`${config.textColor} text-sm leading-relaxed break-words`}>
            {content}
          </p>
          
          {/* Target - inline with better styling */}
          {item.target && (
            <div className="flex items-start gap-2 mt-2">
              <Target className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-gray-600 italic">
                {item.target}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Code block - full width with proper spacing */}
      {item.code && (
        <div className="mt-2 pl-7">
          <CodeBlock code={item.code} />
        </div>
      )}
    </div>
  );
}