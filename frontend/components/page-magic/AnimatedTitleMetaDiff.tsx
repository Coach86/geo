'use client';

import React, { useState, useEffect } from 'react';
import * as Diff from 'diff';

interface AnimatedTitleMetaDiffProps {
  current: string;
  previous: string;
  onAnimationComplete?: () => void;
}

export function AnimatedTitleMetaDiff({ current, previous, onAnimationComplete }: AnimatedTitleMetaDiffProps) {
  const [displayedText, setDisplayedText] = useState(previous);
  const [isAnimating, setIsAnimating] = useState(false);
  const [typewriterIndex, setTypewriterIndex] = useState(0);

  // Get the diff
  const diff = React.useMemo(() => {
    if (!previous || current === previous) return null;
    return Diff.diffWords(previous, current);
  }, [current, previous]);

  // Start animation when content changes
  useEffect(() => {
    if (diff && diff.some(part => part.added || part.removed)) {
      setIsAnimating(true);
      setTypewriterIndex(0);
      setDisplayedText(previous);
    }
  }, [diff, previous]);

  // Typewriter effect
  useEffect(() => {
    if (!isAnimating || !diff) return;

    let currentText = '';
    let currentIndex = 0;
    let targetIndex = 0;

    // Calculate target text and index
    diff.forEach((part) => {
      if (!part.removed) {
        targetIndex += part.value.length;
      }
    });

    const interval = setInterval(() => {
      let rebuiltText = '';
      let processedChars = 0;

      diff.forEach((part) => {
        if (part.removed) {
          // Skip removed parts
          return;
        } else if (part.added) {
          // Type out added parts character by character
          const charsToShow = Math.max(0, Math.min(
            typewriterIndex - processedChars,
            part.value.length
          ));
          rebuiltText += part.value.substring(0, charsToShow);
          processedChars += part.value.length;
        } else {
          // Show unchanged parts immediately
          rebuiltText += part.value;
          processedChars += part.value.length;
        }
      });

      setDisplayedText(rebuiltText);

      // Check if animation is complete
      if (typewriterIndex >= targetIndex) {
        clearInterval(interval);
        setTimeout(() => {
          setIsAnimating(false);
          onAnimationComplete?.();
        }, 500);
      } else {
        setTypewriterIndex(prev => prev + 1);
      }
    }, 50); // Slow typewriter effect

    return () => clearInterval(interval);
  }, [isAnimating, typewriterIndex, diff, onAnimationComplete]);

  // Render with highlighting
  const renderContent = () => {
    if (!diff || !isAnimating) {
      // No animation or diff, just show current text
      if (!previous || current === previous) {
        return <span>{current}</span>;
      }

      // Show final state with highlights
      return (
        <>
          {diff?.map((part, index) => {
            if (part.added) {
              return (
                <span 
                  key={index} 
                  className="inline-block bg-accent/20 px-1 rounded"
                >
                  {part.value}
                </span>
              );
            } else if (part.removed) {
              return null; // Don't show removed parts in final state
            } else {
              return part.value;
            }
          })}
        </>
      );
    }

    // During animation, show current state with highlights for typed parts
    return (
      <>
        {displayedText.split('').map((char, index) => {
          // Check if this character is part of an addition
          let charIndex = 0;
          let isAdded = false;

          if (diff) {
            for (const part of diff) {
              if (part.removed) continue;
              
              const partLength = part.value.length;
              if (index >= charIndex && index < charIndex + partLength) {
                if (part.added && index < typewriterIndex) {
                  isAdded = true;
                }
                break;
              }
              charIndex += partLength;
            }
          }

          if (isAdded) {
            return (
              <span 
                key={index} 
                className="inline-block bg-accent/20 px-0.5 rounded animate-fade-in"
              >
                {char}
              </span>
            );
          }
          return char;
        })}
      </>
    );
  };

  return renderContent();
}