'use client';

import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ContentWithHeadingIndicators } from './ContentWithHeadingIndicators';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = React.useMemo(() => {
    if (!content) return '';
    
    // Configure marked options
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
    });
    
    // Convert markdown to HTML
    const rawHtml = marked.parse(content);
    
    // Sanitize the HTML
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'em', 'strong',
        'b', 'i', 'u', 'a', 'br', 'hr', 'table', 'thead', 'tbody',
        'tr', 'th', 'td', 'img', 'figure', 'figcaption'
      ],
      ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'width', 'height', 'class', 'id'],
    });
  }, [content]);
  
  return (
    <ContentWithHeadingIndicators className={className}>
      <div 
        className="prose prose-sm dark:prose-invert max-w-none pl-14 page-magic-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </ContentWithHeadingIndicators>
  );
}