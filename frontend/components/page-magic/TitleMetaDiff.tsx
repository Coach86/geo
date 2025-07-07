'use client';

import React from 'react';
import * as Diff from 'diff';

interface TitleMetaDiffProps {
  current: string;
  previous: string;
}

export function TitleMetaDiff({ current, previous }: TitleMetaDiffProps) {
  if (!previous || current === previous) {
    // No previous version or no change
    return <span>{current}</span>;
  }

  // Get word-based diff
  const diff = Diff.diffWords(previous, current);
  
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5">
      {diff.map((part, index) => {
        if (part.added) {
          return (
            <span 
              key={index} 
              className="inline-block bg-green-200 dark:bg-green-800 px-1 rounded text-xs"
            >
              {part.value}
            </span>
          );
        } else if (part.removed) {
          return (
            <span 
              key={index} 
              className="inline-block bg-red-200 dark:bg-red-800 px-1 rounded text-xs line-through opacity-60"
            >
              {part.value}
            </span>
          );
        } else {
          return <span key={index}>{part.value}</span>;
        }
      })}
    </span>
  );
}