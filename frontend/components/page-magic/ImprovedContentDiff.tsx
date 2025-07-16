'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Diff from 'diff';
import { ContentWithHeadingIndicators } from './ContentWithHeadingIndicators';
import { Sparkles } from 'lucide-react';
import { renderMarkdown } from './utils/markdown';

interface ImprovedContentDiffProps {
  currentContent: string;
  previousContent?: string;
  animate?: boolean;
  onAnimationComplete?: () => void;
}

interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  value: string;
  id: string;
}

export function ImprovedContentDiff({ 
  currentContent, 
  previousContent,
  animate = false,
  onAnimationComplete 
}: ImprovedContentDiffProps) {
  const [visibleSegments, setVisibleSegments] = useState<Set<string>>(new Set());
  const [currentAnimatingSegment, setCurrentAnimatingSegment] = useState<number>(0);
  const [bubblePosition, setBubblePosition] = useState({ top: 0, opacity: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate diff segments once
  const segments = useMemo(() => {
    if (!previousContent || !currentContent) {
      return [{
        type: 'unchanged' as const,
        value: currentContent || previousContent || '',
        id: 'full-content'
      }];
    }

    const diff = Diff.diffWords(previousContent, currentContent);
    return diff.map((part, index) => ({
      type: part.added ? 'added' as const : part.removed ? 'removed' as const : 'unchanged' as const,
      value: part.value,
      id: `segment-${index}`
    }));
  }, [previousContent, currentContent]);

  // Filter out removed segments and create final content
  const finalSegments = useMemo(() => 
    segments.filter(seg => seg.type !== 'removed'),
    [segments]
  );

  // Initialize visibility
  useEffect(() => {
    if (!animate) {
      // Show everything immediately
      setVisibleSegments(new Set(finalSegments.map(seg => seg.id)));
    } else {
      // Show only unchanged segments initially
      const unchangedIds = finalSegments
        .filter(seg => seg.type === 'unchanged')
        .map(seg => seg.id);
      setVisibleSegments(new Set(unchangedIds));
      setCurrentAnimatingSegment(0);
    }
  }, [finalSegments, animate]);

  // Animate added segments
  useEffect(() => {
    if (!animate) return;

    const addedSegments = finalSegments.filter(seg => seg.type === 'added');
    if (currentAnimatingSegment >= addedSegments.length) {
      // Animation complete
      setBubblePosition(prev => ({ ...prev, opacity: 0 }));
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 300);
      }
      return;
    }

    const segmentToAnimate = addedSegments[currentAnimatingSegment];
    
    // Update bubble position
    const segmentIndex = finalSegments.findIndex(seg => seg.id === segmentToAnimate.id);
    const estimatedPosition = 100 + (segmentIndex * 50); // Rough estimate
    setBubblePosition({ top: estimatedPosition, opacity: 1 });

    // Animate the segment
    const timer = setTimeout(() => {
      setVisibleSegments(prev => new Set([...prev, segmentToAnimate.id]));
      setCurrentAnimatingSegment(prev => prev + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, [animate, currentAnimatingSegment, finalSegments, onAnimationComplete]);

  // Render content with proper markdown and highlighting
  const renderedContent = useMemo(() => {
    // Build the markdown content with markers
    let markedContent = '';
    
    finalSegments.forEach(segment => {
      if (visibleSegments.has(segment.id)) {
        if (segment.type === 'added') {
          markedContent += `<span class="diff-added">${segment.value}</span>`;
        } else {
          markedContent += segment.value;
        }
      }
    });

    // Parse markdown
    const html = renderMarkdown(markedContent);
    
    // Apply highlighting styles
    return html.replace(
      /<span class="diff-added">([\s\S]*?)<\/span>/g,
      '<span class="inline-block bg-accent/20 px-1 rounded animate-fade-in">$1</span>'
    );
  }, [finalSegments, visibleSegments]);

  return (
    <div className="relative">
      {/* AI Bubble */}
      {animate && (
        <div
          className={`absolute left-8 z-50 transition-all duration-500 ease-out`}
          style={{
            top: `${bubblePosition.top}px`,
            opacity: bubblePosition.opacity,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-accent to-blue-500 rounded-full blur-sm opacity-50 animate-pulse" />
            <div className="relative bg-white rounded-full p-1.5 shadow-lg border border-accent">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <ContentWithHeadingIndicators>
        <div 
          ref={contentRef}
          className="prose prose-sm max-w-none pl-14 page-magic-content"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </ContentWithHeadingIndicators>
    </div>
  );
}