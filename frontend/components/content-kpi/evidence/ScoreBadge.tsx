'use client';

import React from 'react';

interface ScoreBadgeProps {
  score: number;
  maxScore?: number;
}

export function ScoreBadge({ score, maxScore }: ScoreBadgeProps) {
  const getScoreStyles = () => {
    if (score > 0) {
      return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800 text-green-800 dark:text-green-200';
    }
    if (score < 0) {
      return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200';
    }
    return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200';
  };

  const formatScore = () => {
    const scoreDisplay = score > 0 ? `+${score}` : score.toString();
    if (maxScore !== undefined && maxScore > 0) {
      return `${scoreDisplay}/${maxScore}`;
    }
    return scoreDisplay;
  };

  return (
    <div className={`inline-flex items-center px-2 py-1 border rounded text-xs font-medium flex-shrink-0 ${getScoreStyles()}`}>
      {formatScore()}
    </div>
  );
}