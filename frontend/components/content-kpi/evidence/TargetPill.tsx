'use client';

import React from 'react';
import { Target } from 'lucide-react';

interface TargetPillProps {
  target: string;
}

export function TargetPill({ target }: TargetPillProps) {
  return (
    <div className="mt-1">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full text-xs text-blue-700 dark:text-blue-300">
        <Target className="h-3 w-3" />
        <span>{target}</span>
      </div>
    </div>
  );
}