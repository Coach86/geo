'use client';

import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import * as Diff from 'diff';
import { ContentWithHeadingIndicators } from './ContentWithHeadingIndicators';
import { Sparkles } from 'lucide-react';

interface AnimatedTypewriterDiffProps {
  currentContent: string;
  previousContent: string;
  onAnimationComplete?: () => void;
}

interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  value: string;
  lineNumber: number;
}

export function AnimatedTypewriterDiff({ 
  currentContent, 
  previousContent,
  onAnimationComplete 
}: AnimatedTypewriterDiffProps) {
  const [displayedContent, setDisplayedContent] = useState(previousContent || '');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const [aiBubblePosition, setAiBubblePosition] = useState({ top: 50, opacity: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [completedSegments, setCompletedSegments] = useState<number[]>([]);

  // Parse content into segments with line tracking
  const segments = React.useMemo(() => {
    const diff = Diff.diffWords(previousContent, currentContent);
    const segments: DiffSegment[] = [];
    let currentLine = 0;
    let currentPosition = 0;

    diff.forEach((part) => {
      // Count lines in this part
      const lines = part.value.split('\n').length - 1;
      
      if (part.added) {
        segments.push({
          type: 'added',
          value: part.value,
          lineNumber: currentLine
        });
      } else if (part.removed) {
        segments.push({
          type: 'removed',
          value: part.value,
          lineNumber: currentLine
        });
      } else {
        segments.push({
          type: 'unchanged',
          value: part.value,
          lineNumber: currentLine
        });
      }
      
      currentLine += lines;
      currentPosition += part.value.length;
    });

    return segments;
  }, [previousContent, currentContent]);

  // Start animation on mount or when content changes
  useEffect(() => {
    if (segments.length > 0 && currentSegmentIndex === -1) {
      console.log('Starting animation with segments:', segments);
      setCurrentSegmentIndex(0);
      setIsAnimating(true);
    }
  }, [segments, currentSegmentIndex]);

  // Handle segment animation
  useEffect(() => {
    if (currentSegmentIndex < 0 || currentSegmentIndex >= segments.length) {
      return;
    }

    const segment = segments[currentSegmentIndex];
    
    // Skip unchanged segments
    if (segment.type === 'unchanged') {
      setCurrentSegmentIndex(prev => prev + 1);
      return;
    }

    // Calculate AI bubble position based on current segment
    if (contentRef.current && segment.type !== 'unchanged') {
      // Use a dynamic position based on segment index
      const basePosition = 50;
      const lineHeight = 24; // Approximate line height
      const position = basePosition + (currentSegmentIndex * lineHeight);
      
      console.log('Setting bubble position for segment:', segment, 'at position:', position);
      setAiBubblePosition({
        top: position,
        opacity: 1
      });
    }

    // Start typewriter effect
    setTypewriterIndex(0);
  }, [currentSegmentIndex, segments]);

  // Typewriter effect
  useEffect(() => {
    if (currentSegmentIndex < 0 || currentSegmentIndex >= segments.length) {
      return;
    }

    const segment = segments[currentSegmentIndex];
    if (segment.type === 'unchanged') {
      return;
    }

    const interval = setInterval(() => {
      setTypewriterIndex(prev => {
        const next = prev + 1;
        
        // Update displayed content
        let newContent = '';
        let processedSegments = 0;
        
        segments.forEach((seg, idx) => {
          if (idx < currentSegmentIndex) {
            // Already processed segments
            if (seg.type !== 'removed') {
              newContent += seg.value;
            }
          } else if (idx === currentSegmentIndex) {
            // Current segment being animated
            if (seg.type === 'added') {
              newContent += seg.value.substring(0, next);
            }
            // Removed segments disappear immediately
          } else {
            // Future segments - show original content
            if (seg.type !== 'added') {
              newContent += seg.value;
            }
          }
        });
        
        setDisplayedContent(newContent);
        
        // Check if current segment is complete
        if (next >= segment.value.length) {
          clearInterval(interval);
          setTimeout(() => {
            if (currentSegmentIndex < segments.length - 1) {
              setCurrentSegmentIndex(prev => prev + 1);
            } else {
              // Animation complete - ensure final content is displayed
              setDisplayedContent(currentContent);
              setIsAnimating(false);
              setAiBubblePosition(prev => ({ ...prev, opacity: 0 }));
              onAnimationComplete?.();
            }
          }, 300);
          return next;
        }
        
        return next;
      });
    }, segment.type === 'removed' ? 30 : 50); // Faster for removals

    return () => clearInterval(interval);
  }, [currentSegmentIndex, segments, onAnimationComplete]);

  // Update completed segments when a segment finishes
  useEffect(() => {
    if (currentSegmentIndex >= 0 && segments[currentSegmentIndex]) {
      const segment = segments[currentSegmentIndex];
      if (segment.type === 'added' && typewriterIndex >= segment.value.length) {
        setCompletedSegments(prev => [...new Set([...prev, currentSegmentIndex])]);
      }
    }
  }, [currentSegmentIndex, segments, typewriterIndex]);

  // Generate a stable key based on the content structure (not the highlighted parts)
  const contentKey = React.useMemo(() => {
    // Generate key from segment values only, ignoring highlighting state
    return segments.map(s => s.type + s.value.length).join('-');
  }, [segments]);

  // Render markdown content with highlights for changes
  const html = React.useMemo(() => {
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
    });
    
    // Build content with diff markers
    let markedContent = '';
    
    // If animation is complete, show final content with all additions highlighted
    if (!isAnimating && currentContent) {
      const diff = Diff.diffWords(previousContent, currentContent);
      diff.forEach((part) => {
        if (part.added) {
          markedContent += `{{ADD_START}}${part.value}{{ADD_END}}`;
        } else if (!part.removed) {
          markedContent += part.value;
        }
      });
    } else {
      // During animation, build content with highlights for completed and current segments
      segments.forEach((segment, idx) => {
        if (segment.type === 'added') {
          const isCompleted = completedSegments.includes(idx);
          const isCurrentlyTyping = idx === currentSegmentIndex && typewriterIndex > 0;
          
          if (isCompleted) {
            // Full segment with highlight
            markedContent += `{{ADD_START}}${segment.value}{{ADD_END}}`;
          } else if (isCurrentlyTyping) {
            // Partial segment being typed
            markedContent += `{{ADD_START}}${segment.value.substring(0, typewriterIndex)}{{ADD_END}}`;
          }
        } else if (segment.type === 'unchanged') {
          markedContent += segment.value;
        }
        // Skip removed segments
      });
    }
    
    // Parse markdown
    let html = marked.parse(markedContent);
    
    // Replace markers with styled spans
    html = html.replace(/{{ADD_START}}(.*?){{ADD_END}}/gs, (match, content) => {
      return `<span class="inline-block bg-green-200 dark:bg-green-800 px-1 rounded">${content}</span>`;
    });
    
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'em', 'strong',
        'b', 'i', 'u', 'a', 'br', 'hr', 'table', 'thead', 'tbody',
        'tr', 'th', 'td', 'img', 'figure', 'figcaption'
      ],
      ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'width', 'height', 'class', 'id'],
    });
  }, [displayedContent, currentContent, previousContent, isAnimating, segments, currentSegmentIndex, typewriterIndex, completedSegments]);

  return (
    <div className="relative">
      {/* AI Bubble */}
      <div
        className={`absolute left-8 z-50 transition-all duration-500 ease-out ${
          isAnimating ? 'block' : 'hidden'
        }`}
        style={{
          top: `${aiBubblePosition.top}px`,
          opacity: aiBubblePosition.opacity,
          transform: 'translateY(-50%)',
        }}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-sm opacity-50 animate-pulse" />
          <div className="relative bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-lg border border-green-400 dark:border-green-600">
            <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      {/* Content */}
      <ContentWithHeadingIndicators>
        <div 
          ref={contentRef}
          key="content-container"
          className="prose prose-sm dark:prose-invert max-w-none pl-14 page-magic-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </ContentWithHeadingIndicators>
    </div>
  );
}