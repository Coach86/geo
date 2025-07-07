'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface HeadingIndicatorProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const headingStyles = {
  1: 'bg-purple-500 text-white',
  2: 'bg-blue-500 text-white',
  3: 'bg-green-500 text-white',
  4: 'bg-yellow-500 text-black',
  5: 'bg-orange-500 text-white',
  6: 'bg-pink-500 text-white',
};

export function HeadingIndicator({ level, className }: HeadingIndicatorProps) {
  return (
    <span 
      className={cn(
        'inline-flex items-center justify-center',
        'absolute -left-12 top-1',
        'text-xs font-bold',
        'w-8 h-5 rounded',
        'shadow-sm',
        'z-10', // Add z-index to ensure it's above other content
        headingStyles[level],
        className
      )}
    >
      H{level}
    </span>
  );
}