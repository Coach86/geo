'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ListItemIndicatorProps {
  type: 'ul' | 'ol';
  className?: string;
}

export function ListItemIndicator({ type, className }: ListItemIndicatorProps) {
  const styles = {
    ul: 'bg-indigo-500 text-white',
    ol: 'bg-cyan-500 text-white',
  };

  return (
    <span 
      className={cn(
        'inline-flex items-center justify-center',
        'absolute -left-12 top-1',
        'text-xs font-bold',
        'w-8 h-5 rounded',
        'shadow-sm',
        'z-10',
        styles[type],
        className
      )}
    >
      {type === 'ul' ? '•' : '#'}
    </span>
  );
}