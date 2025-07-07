'use client';

import React, { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReadableContent } from './ReadableContent';
import { ContentWithHeadingIndicators } from './ContentWithHeadingIndicators';
import { HeadingIndicator } from './HeadingIndicator';

interface ContentViewerProps {
  content?: string;
  html?: string; // Add HTML option
  title?: string;
  metaDescription?: string;
  metas?: Record<string, string>;
  loading?: boolean;
  error?: string;
  metadata?: {
    wordCount?: number;
    paragraphs?: number;
    headings?: number;
  };
  className?: string;
}

export function ContentViewer({
  content,
  html,
  title,
  metaDescription,
  metas,
  loading = false,
  error,
  metadata,
  className
}: ContentViewerProps) {
  const [extractedTitle, setExtractedTitle] = useState<string | undefined>();
  
  const handleMetadata = useCallback((meta: { title?: string; excerpt?: string }) => {
    if (meta.title) {
      setExtractedTitle(meta.title);
    }
  }, []);
  // Format content for better readability
  const formatContent = (text: string) => {
    if (!text) return [];
    
    // Split by double newlines to get paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim();
      
      // Check if it's a list item
      const isList = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed);
      
      // Check if it's likely a heading
      const isHeading = !isList && 
        trimmed.length < 100 && 
        !trimmed.endsWith('.') &&
        !trimmed.endsWith(',') &&
        !trimmed.endsWith(':') &&
        trimmed[0] === trimmed[0].toUpperCase() &&
        trimmed.split(' ').length < 10;
      
      return {
        id: index,
        text: trimmed,
        isHeading,
        isList
      };
    });
  };

  const formattedContent = content ? formatContent(content) : [];
  const displayTitle = extractedTitle || title;

  if (loading) {
    return (
      <div className={cn("p-6 space-y-4", className)}>
        <Skeleton className="h-8 w-3/4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center space-y-4 text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <div>
            <h3 className="text-lg font-semibold">Error Loading Content</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!content && !html) {
    return (
      <div className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center space-y-4 text-center py-12">
          <FileText className="h-12 w-12 text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold">No Content</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Content will appear here after processing
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full overflow-auto", className)}>
      <div className="p-6 space-y-6 relative">
        {/* Metadata */}
        {(displayTitle || metaDescription || metas || metadata) && (
          <div className="space-y-3 pb-4 border-b">
            <div className="space-y-2">
              {displayTitle && (
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="text-xs w-32 justify-center">
                    Title
                  </Badge>
                  <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">
                    {displayTitle}
                  </span>
                </div>
              )}
              {metaDescription && (
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="text-xs w-32 justify-center">
                    Meta Description
                  </Badge>
                  <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">
                    {metaDescription}
                  </span>
                </div>
              )}
              {metas && Object.entries(metas).map(([key, value]) => {
                // Skip description if already shown as metaDescription
                if (key === 'description' && metaDescription) return null;
                return (
                  <div key={key} className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-xs w-32 justify-center">
                      Meta {key}
                    </Badge>
                    <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
            {metadata && (
              <div className="flex gap-2 flex-wrap">
                {metadata?.wordCount !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    {metadata.wordCount} words
                  </Badge>
                )}
                {metadata?.paragraphs !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    {metadata.paragraphs} paragraphs
                  </Badge>
                )}
                {metadata?.headings !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    {metadata.headings} headings
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content - use ReadableContent for HTML or formatted content for text */}
        {html ? (
          <ReadableContent 
            html={html} 
            className="prose prose-sm dark:prose-invert max-w-none" 
            onMetadata={handleMetadata}
          />
        ) : (
          <ContentWithHeadingIndicators>
            <div className="prose prose-sm dark:prose-invert max-w-none pl-14 page-magic-content">
              {formattedContent.map((item) => {
                if (item.isHeading) {
                  return (
                    <h2 key={item.id} className="relative">
                      {item.text}
                    </h2>
                  );
                }
                return (
                  <p key={item.id} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                    {item.text}
                  </p>
                );
              })}
            </div>
          </ContentWithHeadingIndicators>
        )}
      </div>
    </div>
  );
}