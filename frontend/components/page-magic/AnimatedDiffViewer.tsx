'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MarkdownDiffViewer } from './MarkdownDiffViewer';
import { BrowserFrame } from './BrowserFrame';
import { SvgLoader } from '@/components/ui/svg-loader';
import { TitleMetaDiff } from './TitleMetaDiff';
import { AnimatedTitleMetaDiff } from './AnimatedTitleMetaDiff';

export interface ContentVersion {
  content: string;
  contentMarkdown?: string;
  title?: string;
  metaDescription?: string;
  metas?: Record<string, string>;
  ruleProcessed?: string;
  timestamp: Date;
  version: number;
}

interface AnimatedDiffViewerProps {
  url?: string;
  versions: ContentVersion[];
  currentVersionIndex: number;
  isProcessing?: boolean;
  onVersionChange?: (index: number) => void;
}

export function AnimatedDiffViewer({
  url,
  versions,
  currentVersionIndex,
  isProcessing = false,
  onVersionChange,
}: AnimatedDiffViewerProps) {
  const [animationKey, setAnimationKey] = useState(0);
  const [useAnimatedDiff, setUseAnimatedDiff] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const currentVersion = versions[currentVersionIndex] || versions[0];
  // Always compare against the original content (version 1), not the previous version
  const previousVersion = currentVersionIndex > 0 ? versions[0] : null;

  // Trigger animation when version changes
  useEffect(() => {
    if (currentVersionIndex > 0) {
      setAnimationKey(prev => prev + 1);
      setUseAnimatedDiff(true);

      // Highlight changes briefly
      const timer = setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.classList.add('flash-highlight');
          setTimeout(() => {
            contentRef.current?.classList.remove('flash-highlight');
          }, 1000);
        }
      }, 100);

      // Turn off animated diff after a delay to show final state
      const animTimer = setTimeout(() => {
        setUseAnimatedDiff(false);
      }, 5000); // Give enough time for all animations

      return () => {
        clearTimeout(timer);
        clearTimeout(animTimer);
      };
    }
  }, [currentVersionIndex]);


  return (
    <BrowserFrame
      url={url || "about:blank"}
      title={`Content Evolution (v${currentVersion?.version || 1})`}
      className="h-full"
    >
      <div className="h-full flex flex-col">
        {/* Header Controls */}
        <div className="p-4 border-b space-y-3">
          {/* Latest Change Info */}
          {currentVersion?.ruleProcessed && currentVersionIndex > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-lg w-fit">
              <Zap className="h-3 w-3 text-accent" />
              <span className="text-xs text-accent">
                Applied: {currentVersion.ruleProcessed}
              </span>
            </div>
          )}
          
          {/* Title and Meta display with diffs - Type in pill, content inline */}
          {(currentVersion?.title || currentVersion?.metaDescription || currentVersion?.metas || 
            previousVersion?.title || previousVersion?.metaDescription || previousVersion?.metas) && (
            <div className="space-y-2">
              {/* Title diff */}
              {(currentVersion?.title || previousVersion?.title) && (
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="text-xs w-32 justify-center">
                    Title
                  </Badge>
                  <span className="text-xs text-gray-700 flex-1">
                    {useAnimatedDiff && currentVersionIndex > 0 ? (
                      <AnimatedTitleMetaDiff 
                        current={currentVersion?.title || ''} 
                        previous={previousVersion?.title || ''} 
                      />
                    ) : (
                      <TitleMetaDiff 
                        current={currentVersion?.title || ''} 
                        previous={previousVersion?.title || ''} 
                      />
                    )}
                  </span>
                </div>
              )}
              
              {/* Meta Description diff */}
              {(currentVersion?.metaDescription || previousVersion?.metaDescription) && (
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="text-xs w-32 justify-center">
                    Meta Description
                  </Badge>
                  <span className="text-xs text-gray-700 flex-1">
                    {useAnimatedDiff && currentVersionIndex > 0 ? (
                      <AnimatedTitleMetaDiff 
                        current={currentVersion?.metaDescription || ''} 
                        previous={previousVersion?.metaDescription || ''} 
                      />
                    ) : (
                      <TitleMetaDiff 
                        current={currentVersion?.metaDescription || ''} 
                        previous={previousVersion?.metaDescription || ''} 
                      />
                    )}
                  </span>
                </div>
              )}
              
              {/* Other metas diff */}
              {(currentVersion?.metas || previousVersion?.metas) && (() => {
                const allKeys = new Set([
                  ...Object.keys(currentVersion?.metas || {}),
                  ...Object.keys(previousVersion?.metas || {})
                ]);
                
                return Array.from(allKeys).map(key => {
                  // Skip description if already shown as metaDescription
                  if (key === 'description' && (currentVersion?.metaDescription || previousVersion?.metaDescription)) return null;
                  
                  const currentValue = currentVersion?.metas?.[key] || '';
                  const previousValue = previousVersion?.metas?.[key] || '';
                  
                  return (
                    <div key={key} className="flex items-start gap-2">
                      <Badge variant="secondary" className="text-xs w-32 justify-center">
                        Meta {key}
                      </Badge>
                      <span className="text-xs text-gray-700 flex-1">
                        {useAnimatedDiff && currentVersionIndex > 0 ? (
                          <AnimatedTitleMetaDiff 
                            current={currentValue} 
                            previous={previousValue} 
                          />
                        ) : (
                          <TitleMetaDiff 
                            current={currentValue} 
                            previous={previousValue} 
                          />
                        )}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 overflow-auto relative">
          {/* Animated Content Container */}
          <div
            ref={contentRef}
            key={animationKey}
            className="transition-all duration-500 ease-in-out transform animate-in fade-in slide-in-from-bottom-2"
          >
            {/* Content */}
            <div
              key={animationKey}
              className="animate-in fade-in slide-in-from-bottom-2 duration-500"
            >
              <MarkdownDiffViewer 
                currentContent={currentVersion.contentMarkdown || currentVersion.content}
                previousContent={previousVersion?.contentMarkdown || previousVersion?.content}
                showDiff={true}
              />
            </div>
          </div>

          {/* Processing Overlay with Mint Loader - Only show when no improvements yet */}
          {isProcessing && currentVersionIndex === 0 && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg">
              <div className="flex flex-col items-center gap-4 pt-24">
                <SvgLoader size="xl" />
                <span className="text-sm font-medium text-gray-700">
                  Minting...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Version Navigation */}
        {versions.length > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onVersionChange?.(Math.max(0, currentVersionIndex - 1))}
              disabled={currentVersionIndex === 0}
            >
              Previous
            </Button>

            <span className="text-sm text-muted-foreground">
              {currentVersionIndex + 1} of {versions.length}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onVersionChange?.(Math.min(versions.length - 1, currentVersionIndex + 1))}
              disabled={currentVersionIndex === versions.length - 1}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </BrowserFrame>
  );
}
