'use client';

import React, { useReducer, useEffect, useRef, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { BrowserFrame } from './BrowserFrame';
import { SvgLoader } from '@/components/ui/svg-loader';
import { MarkdownTitleMetaDiff } from './MarkdownTitleMetaDiff';
import { ImprovedContentDiff } from './ImprovedContentDiff';
import { renderInlineMarkdown } from './utils/markdown';

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

// Animation state machine
type AnimationState = 'IDLE' | 'PREPARING' | 'ANIMATING_META' | 'ANIMATING_CONTENT' | 'COMPLETE';

interface AnimationStateData {
  state: AnimationState;
  animatedVersions: Set<number>;
  currentAnimatingVersion: number | null;
}

type AnimationAction = 
  | { type: 'START_ANIMATION'; versionIndex: number }
  | { type: 'META_ANIMATION_COMPLETE' }
  | { type: 'CONTENT_ANIMATION_COMPLETE' }
  | { type: 'RESET' };

function animationReducer(state: AnimationStateData, action: AnimationAction): AnimationStateData {
  switch (action.type) {
    case 'START_ANIMATION':
      if (state.animatedVersions.has(action.versionIndex)) {
        return state; // Already animated
      }
      return {
        ...state,
        state: 'PREPARING',
        currentAnimatingVersion: action.versionIndex,
      };
    
    case 'META_ANIMATION_COMPLETE':
      return {
        ...state,
        state: 'ANIMATING_CONTENT',
      };
    
    case 'CONTENT_ANIMATION_COMPLETE':
      return {
        ...state,
        state: 'COMPLETE',
        animatedVersions: new Set([...state.animatedVersions, state.currentAnimatingVersion as number]),
        currentAnimatingVersion: null,
      };
    
    case 'RESET':
      return {
        state: 'IDLE',
        animatedVersions: new Set(),
        currentAnimatingVersion: null,
      };
    
    default:
      return state;
  }
}

export function ImprovedAnimatedDiffViewer({
  url,
  versions,
  currentVersionIndex,
  isProcessing = false,
  onVersionChange,
}: AnimatedDiffViewerProps) {
  const [animationState, dispatch] = useReducer(animationReducer, {
    state: 'IDLE',
    animatedVersions: new Set<number>(),
    currentAnimatingVersion: null,
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const diffRef = useRef<HTMLDivElement>(null);

  const currentVersion = versions[currentVersionIndex] || versions[0];
  const originalVersion = versions[0]; // Always diff against original
  const shouldAnimate = animationState.currentAnimatingVersion === currentVersionIndex;

  // Trigger animation for new versions
  useEffect(() => {
    if (currentVersionIndex > 0 && !animationState.animatedVersions.has(currentVersionIndex)) {
      dispatch({ type: 'START_ANIMATION', versionIndex: currentVersionIndex });
    }
  }, [currentVersionIndex, animationState.animatedVersions]);

  // Handle animation state transitions
  useEffect(() => {
    if (animationState.state === 'PREPARING') {
      // Scroll to diff area
      if (diffRef.current) {
        diffRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      
      // Start meta animations after a brief delay
      const timer = setTimeout(() => {
        dispatch({ type: 'META_ANIMATION_COMPLETE' });
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [animationState.state]);

  // Memoize meta diffs calculation
  const metaDiffs = useMemo(() => {
    if (!currentVersion || currentVersionIndex === 0) return [];
    
    const diffs = [];
    
    // Title diff
    if (currentVersion.title || originalVersion.title) {
      diffs.push({
        type: 'title',
        label: 'Title',
        current: currentVersion.title || '',
        previous: originalVersion.title || '',
      });
    }
    
    // Meta description diff
    if (currentVersion.metaDescription || originalVersion.metaDescription) {
      diffs.push({
        type: 'metaDescription',
        label: 'Meta Description',
        current: currentVersion.metaDescription || '',
        previous: originalVersion.metaDescription || '',
      });
    }
    
    // Other metas diff
    const allMetaKeys = new Set([
      ...Object.keys(currentVersion.metas || {}),
      ...Object.keys(originalVersion.metas || {}),
    ]);
    
    allMetaKeys.forEach(key => {
      if (key === 'description' && (currentVersion.metaDescription || originalVersion.metaDescription)) {
        return; // Skip if already shown as metaDescription
      }
      
      diffs.push({
        type: 'meta',
        label: `Meta ${key}`,
        current: currentVersion.metas?.[key] || '',
        previous: originalVersion.metas?.[key] || '',
      });
    });
    
    return diffs;
  }, [currentVersion, originalVersion, currentVersionIndex]);

  const handleMetaAnimationComplete = useCallback(() => {
    if (animationState.state === 'ANIMATING_META') {
      dispatch({ type: 'META_ANIMATION_COMPLETE' });
    }
  }, [animationState.state]);

  const handleContentAnimationComplete = useCallback(() => {
    if (animationState.state === 'ANIMATING_CONTENT') {
      dispatch({ type: 'CONTENT_ANIMATION_COMPLETE' });
    }
  }, [animationState.state]);

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
              <div 
                className="text-xs text-accent"
                dangerouslySetInnerHTML={{ 
                  __html: `Applied: ${renderInlineMarkdown(currentVersion.ruleProcessed)}` 
                }}
              />
            </div>
          )}
          
          {/* Meta diffs */}
          {metaDiffs.length > 0 && (
            <div className="space-y-2">
              {metaDiffs.map((diff, index) => (
                <div key={`${diff.type}-${index}`} className="flex items-start gap-2">
                  <Badge variant="secondary" className="text-xs w-32 justify-center">
                    {diff.label}
                  </Badge>
                  <span className="text-xs text-gray-700 flex-1">
                    <MarkdownTitleMetaDiff 
                      current={diff.current}
                      previous={diff.previous}
                      animated={shouldAnimate && animationState.state === 'ANIMATING_META'}
                      onAnimationComplete={
                        index === metaDiffs.length - 1 ? handleMetaAnimationComplete : undefined
                      }
                    />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 overflow-auto relative">
          <div ref={contentRef}>
            <div ref={diffRef}>
              <ImprovedContentDiff
                currentContent={currentVersion.contentMarkdown || currentVersion.content}
                previousContent={originalVersion?.contentMarkdown || originalVersion?.content}
                animate={shouldAnimate && animationState.state === 'ANIMATING_CONTENT'}
                onAnimationComplete={handleContentAnimationComplete}
              />
            </div>
          </div>

          {/* Processing Overlay */}
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