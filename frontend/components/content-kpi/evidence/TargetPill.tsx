'use client';

import React from 'react';
import { Target } from 'lucide-react';

interface TargetPillProps {
  target: string;
}

export function TargetPill({ target }: TargetPillProps) {
  return (
    <div className="mt-2 flex justify-center">
      <div className="px-3 py-1.5 bg-blue-100 border border-blue-300 rounded text-xs text-blue-800 font-medium">
        {target}
      </div>
    </div>
  );
}