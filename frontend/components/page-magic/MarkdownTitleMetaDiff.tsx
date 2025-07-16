'use client';

import React from 'react';
import * as Diff from 'diff';
import { renderInlineMarkdown } from './utils/markdown';

interface MarkdownTitleMetaDiffProps {
  current: string;
  previous: string;
  animated?: boolean;
  onAnimationComplete?: () => void;
}

export function MarkdownTitleMetaDiff({ 
  current, 
  previous,
  animated = false,
  onAnimationComplete
}: MarkdownTitleMetaDiffProps) {
  const [displayedParts, setDisplayedParts] = React.useState<Array<{ type: string; value: string; visible: boolean }>>([]);
  const [animationIndex, setAnimationIndex] = React.useState(0);

  // Calculate diff
  const diffParts = React.useMemo(() => {
    if (!previous || current === previous) {
      return [{ type: 'unchanged', value: current }];
    }
    
    const diff = Diff.diffWords(previous, current);
    return diff.map(part => ({
      type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
      value: part.value
    }));
  }, [current, previous]);

  // Initialize display state
  React.useEffect(() => {
    if (!animated) {
      // Show all parts immediately
      setDisplayedParts(diffParts.map(part => ({ ...part, visible: true })));
    } else {
      // Hide added parts initially for animation
      setDisplayedParts(diffParts.map(part => ({
        ...part,
        visible: part.type !== 'added'
      })));
      setAnimationIndex(0);
    }
  }, [diffParts, animated]);

  // Animate added parts
  React.useEffect(() => {
    if (!animated || animationIndex >= diffParts.length) {
      if (animated && animationIndex >= diffParts.length && onAnimationComplete) {
        onAnimationComplete();
      }
      return;
    }

    const currentPart = diffParts[animationIndex];
    if (currentPart.type === 'added') {
      const timer = setTimeout(() => {
        setDisplayedParts(prev => 
          prev.map((part, idx) => 
            idx === animationIndex ? { ...part, visible: true } : part
          )
        );
        setAnimationIndex(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Skip non-added parts
      setAnimationIndex(prev => prev + 1);
    }
  }, [animated, animationIndex, diffParts, onAnimationComplete]);

  // Render the diff with proper markdown handling
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5">
      {displayedParts.map((part, index) => {
        if (!part.visible) return null;

        const htmlContent = renderInlineMarkdown(part.value);
        
        if (part.type === 'added') {
          return (
            <span 
              key={index} 
              className="inline-block bg-accent/20 px-1 rounded text-xs animate-fade-in"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          );
        } else if (part.type === 'removed') {
          return (
            <span 
              key={index} 
              className="inline-block bg-red-200 px-1 rounded text-xs line-through opacity-60"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          );
        } else {
          return (
            <span 
              key={index}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          );
        }
      })}
    </span>
  );
}