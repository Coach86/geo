'use client';

import React, { useEffect, useRef } from 'react';
import { HeadingIndicator } from './HeadingIndicator';
import { ListItemIndicator } from './ListItemIndicator';
import { createPortal } from 'react-dom';

interface ContentWithHeadingIndicatorsProps {
  children: React.ReactNode;
  className?: string;
}

export function ContentWithHeadingIndicators({ 
  children, 
  className 
}: ContentWithHeadingIndicatorsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicators, setIndicators] = React.useState<Array<{
    id: string;
    type: 'heading' | 'list';
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    listType?: 'ul' | 'ol';
    element: HTMLElement;
  }>>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateIndicators = () => {
      const newIndicators: typeof indicators = [];
      
      // Find all headings
      const headings = containerRef.current!.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName[1]) as 1 | 2 | 3 | 4 | 5 | 6;
        const id = `heading-${index}-${Date.now()}`;
        
        // Add relative positioning to heading if not already set
        const htmlHeading = heading as HTMLElement;
        if (getComputedStyle(htmlHeading).position === 'static') {
          htmlHeading.style.position = 'relative';
        }
        
        newIndicators.push({
          id,
          type: 'heading',
          level,
          element: htmlHeading,
        });
      });

      // Find all list items
      const listItems = containerRef.current!.querySelectorAll('li');
      listItems.forEach((li, index) => {
        const id = `list-${index}-${Date.now()}`;
        
        // Determine if it's part of ul or ol
        let parent = li.parentElement;
        let listType: 'ul' | 'ol' | null = null;
        
        while (parent && parent !== containerRef.current) {
          if (parent.tagName === 'UL') {
            listType = 'ul';
            break;
          } else if (parent.tagName === 'OL') {
            listType = 'ol';
            break;
          }
          parent = parent.parentElement;
        }
        
        if (listType) {
          // Add relative positioning to list item if not already set
          const htmlLi = li as HTMLElement;
          if (getComputedStyle(htmlLi).position === 'static') {
            htmlLi.style.position = 'relative';
          }
          
          newIndicators.push({
            id,
            type: 'list',
            listType,
            element: htmlLi,
          });
        }
      });

      setIndicators(newIndicators);
    };

    // Initial update
    updateIndicators();

    // Create observer for content changes
    const observer = new MutationObserver(updateIndicators);
    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [children]);

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative' }}>
      {children}
      {indicators.map(({ id, type, level, listType, element }) => 
        element.parentElement && createPortal(
          type === 'heading' && level ? (
            <HeadingIndicator level={level} />
          ) : type === 'list' && listType ? (
            <ListItemIndicator type={listType} />
          ) : null,
          element,
          id
        )
      )}
    </div>
  );
}