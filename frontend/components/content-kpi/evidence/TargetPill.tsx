'use client';

import React from 'react';
import { Target } from 'lucide-react';

interface TargetPillProps {
  target: string;
}

export function TargetPill({ target }: TargetPillProps) {
  return (
    <div className="mt-2 flex justify-center">
      <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded text-xs text-blue-800 dark:text-blue-200 font-medium">
        {target}
      </div>
    </div>
  );
}