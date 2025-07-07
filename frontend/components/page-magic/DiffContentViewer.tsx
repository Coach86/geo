'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as Diff from 'diff';
import { ContentWithHeadingIndicators } from './ContentWithHeadingIndicators';

interface DiffContentViewerProps {
  originalContent: string;
  improvedContent: string;
  title?: string;
  metaDescription?: string;
  loading?: boolean;
  error?: string;
  className?: string;
}

export function DiffContentViewer({
  originalContent,
  improvedContent,
  title,
  metaDescription,
  loading = false,
  error,
  className
}: DiffContentViewerProps) {
  const diffParts = useMemo(() => {
    if (!originalContent || !improvedContent) return [];
    
    // Calculate word-by-word diff for better granularity
    const changes = Diff.diffWords(originalContent, improvedContent);
    
    // Debug logging
    const addedCount = changes.filter(c => c.added).length;
    const removedCount = changes.filter(c => c.removed).length;
    console.log(`[DiffContentViewer] Diff analysis: ${changes.length} parts, ${addedCount} added, ${removedCount} removed`);
    
    return changes.map((part, index) => ({
      id: index,
      value: part.value,
      added: part.added || false,
      removed: part.removed || false,
    }));
  }, [originalContent, improvedContent]);

  const metadata = useMemo(() => {
    if (!improvedContent) return null;
    
    const words = improvedContent.split(/\s+/).length;
    const originalWords = originalContent ? originalContent.split(/\s+/).length : 0;
    const addedWords = words - originalWords;
    
    return {
      wordCount: words,
      addedWords: addedWords > 0 ? addedWords : 0,
      removedWords: addedWords < 0 ? Math.abs(addedWords) : 0,
    };
  }, [originalContent, improvedContent]);

  if (loading) {
    return (
      <div className={cn("p-6 space-y-4", className)}>
        <Skeleton className="h-8 w-3/4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
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

  if (!improvedContent) {
    return (
      <div className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center space-y-4 text-center py-12">
          <FileText className="h-12 w-12 text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold">No Content</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Improved content will appear here after processing
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full overflow-auto", className)}>
      <div className="p-6 space-y-6">
        {/* Metadata */}
        {(title || metaDescription || metadata) && (
          <div className="flex gap-2 pb-4 border-b flex-wrap">
            {title && (
              <Badge variant="secondary" className="text-xs">
                Title: {title}
              </Badge>
            )}
            {metaDescription && (
              <Badge variant="secondary" className="text-xs">
                Meta: {metaDescription}
              </Badge>
            )}
            {metadata && (
              <>
                <Badge variant="outline" className="text-xs">
                  {metadata.wordCount} words
                </Badge>
                {metadata.addedWords > 0 && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                    +{metadata.addedWords} added
                  </Badge>
                )}
                {metadata.removedWords > 0 && (
                  <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                    -{metadata.removedWords} removed
                  </Badge>
                )}
              </>
            )}
          </div>
        )}

        {/* Diff Indicator */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="text-xs">
            Diff View
          </Badge>
          <span className="text-xs text-muted-foreground">
            <span className="bg-green-200 text-green-900 dark:bg-green-400/30 dark:text-green-200 px-1 rounded">Green highlights</span> show AI improvements
          </span>
        </div>

        {/* Diff Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap">
            {diffParts.map(part => {
              if (part.removed) {
                // Don't show removed content in the improved view
                return null;
              }
              
              if (part.added) {
                return (
                  <span
                    key={part.id}
                    className="bg-green-200 text-green-900 dark:bg-green-400/30 dark:text-green-200 font-semibold px-1 py-0.5 rounded"
                  >
                    {part.value}
                  </span>
                );
              }
              
              // Unchanged content
              return (
                <span key={part.id} className="text-gray-700 dark:text-gray-300">
                  {part.value}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}