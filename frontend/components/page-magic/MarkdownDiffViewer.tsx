'use client';

import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { AnimatedTypewriterDiff } from './AnimatedTypewriterDiff';

interface MarkdownDiffViewerProps {
  currentContent: string;
  previousContent?: string;
  showDiff: boolean;
}

export function MarkdownDiffViewer({ currentContent, previousContent, showDiff }: MarkdownDiffViewerProps) {
  // If not showing diff or no previous content, just render normally
  if (!showDiff || !previousContent) {
    return <MarkdownRenderer content={currentContent} />;
  }

  // Show animated typewriter diff with AI bubble
  return <AnimatedTypewriterDiff currentContent={currentContent} previousContent={previousContent} />;
}