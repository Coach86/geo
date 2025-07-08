'use client';

import React from 'react';

interface ScoreBadgeProps {
  score: number;
  maxScore?: number;
}

export function ScoreBadge({ score, maxScore }: ScoreBadgeProps) {
  const getScoreStyles = () => {
    if (score > 0) {
      return 'bg-accent/10 border-accent/30 text-accent';
    }
    if (score < 0) {
      return 'bg-red-100 border-red-300 text-red-800';
    }
    return 'bg-gray-100 border-gray-300 text-gray-800';
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