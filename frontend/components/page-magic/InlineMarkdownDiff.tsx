'use client';

import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import * as Diff from 'diff';
import { ContentWithHeadingIndicators } from './ContentWithHeadingIndicators';

interface InlineMarkdownDiffProps {
  currentContent: string;
  previousContent: string;
}

export function InlineMarkdownDiff({ currentContent, previousContent }: InlineMarkdownDiffProps) {
  const html = useMemo(() => {
    // Get word-based diff
    const diff = Diff.diffWords(previousContent, currentContent);
    
    // Build markdown with inline diff markers
    let markedContent = '';
    diff.forEach((part) => {
      if (part.added) {
        // Wrap added content in a special marker
        markedContent += `{{ADD_START}}${part.value}{{ADD_END}}`;
      } else if (!part.removed) {
        // Keep unchanged content
        markedContent += part.value;
      }
      // Skip removed content
    });
    
    // Configure marked
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
    });
    
    // Parse markdown to HTML
    let html = marked.parse(markedContent);
    
    // Sanitize HTML
    html = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'em', 'strong',
        'b', 'i', 'u', 'a', 'br', 'hr', 'table', 'thead', 'tbody',
        'tr', 'th', 'td', 'img', 'figure', 'figcaption'
      ],
      ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'width', 'height', 'class', 'id'],
    });
    
    // Replace our markers with styled spans with fade-in animation
    html = html.replace(/{{ADD_START}}(.*?){{ADD_END}}/gs, (match, content) => {
      return `<span class="inline-block bg-green-200 dark:bg-green-800 px-1 rounded animate-fade-in">${content}</span>`;
    });
    
    return html;
  }, [currentContent, previousContent]);

  return (
    <ContentWithHeadingIndicators>
      <div 
        className="prose prose-sm dark:prose-invert max-w-none pl-14 page-magic-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </ContentWithHeadingIndicators>
  );
}