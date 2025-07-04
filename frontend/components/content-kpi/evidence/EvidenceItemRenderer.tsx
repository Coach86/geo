'use client';

import React from 'react';
import { ScoreBadge } from './ScoreBadge';
import { TargetPill } from './TargetPill';
import { CodeBlock } from './CodeBlock';
import { EVIDENCE_TYPE_CONFIG } from './evidenceConfig';

export type EvidenceType = 
  | 'info'      // General information (default)
  | 'success'   // Success/passing items (✓)
  | 'warning'   // Warnings or minor issues (⚠)
  | 'error'     // Errors or failures (✗)
  | 'score'     // Score calculations
  | 'heading';  // Section headers

export interface EvidenceItem {
  type: EvidenceType;
  content: string;
  target?: string;
  code?: string;
  score?: number;
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
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {content}
        </h4>
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
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Score Calculation
          </h5>
          <div className="font-mono text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
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
    <div className="group">
      <div className="flex items-start gap-2.5 text-sm py-1.5">
        <Icon className={`h-4 w-4 ${config.iconColor} mt-0.5 flex-shrink-0`} />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <span className={`${config.textColor} leading-relaxed`}>{content}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Icon className={`h-4 w-4 ${config.iconColor}`} />
              {item.score !== undefined ? (
                <ScoreBadge score={item.score} />
              ) : (
                <div className="w-12" />
              )}
            </div>
          </div>
          {item.target && <TargetPill target={item.target} />}
        </div>
      </div>
      {item.code && <CodeBlock code={item.code} />}
    </div>
  );
}