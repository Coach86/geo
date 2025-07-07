'use client';

import React, { useMemo, useEffect } from 'react';
import DOMPurify from 'dompurify';
// @ts-ignore - Readability doesn't have TypeScript definitions
import { Readability } from '@mozilla/readability';
import { ContentWithHeadingIndicators } from './ContentWithHeadingIndicators';

interface ReadableContentProps {
  html: string;
  className?: string;
  onMetadata?: (metadata: { title?: string; excerpt?: string }) => void;
}

export function ReadableContent({ html, className, onMetadata }: ReadableContentProps) {
  const { cleanedHTML, metadata } = useMemo(() => {
    if (!html) return { cleanedHTML: '', metadata: null };

    try {
      // First sanitize the HTML to remove any malicious content
      const sanitized = DOMPurify.sanitize(html, {
        WHOLE_DOCUMENT: true,
        RETURN_DOM: false,
      });

      // Create a DOM from the sanitized HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitized, 'text/html');

      // Use Mozilla Readability to extract the main content
      const reader = new Readability(doc, {
        charThreshold: 100,
        debug: false,
      });

      const article = reader.parse();

      if (article && article.content) {
        // Store metadata to be sent via useEffect
        const extractedMetadata = {
          title: article.title,
          excerpt: article.excerpt,
        };
        
        // Readability returns clean HTML content
        // Apply final sanitization with specific allowed tags
        const content = DOMPurify.sanitize(article.content, {
          ALLOWED_TAGS: [
            'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'em', 'strong',
            'b', 'i', 'u', 'a', 'br', 'hr', 'table', 'thead', 'tbody',
            'tr', 'th', 'td', 'img', 'figure', 'figcaption', 'section',
            'article', 'main'
          ],
          ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'width', 'height', 'class'],
          KEEP_CONTENT: true,
          // Add classes for styling
          ADD_ATTR: ['target'],
          FORBID_TAGS: ['style', 'script'],
        });
        
        return { cleanedHTML: content, metadata: extractedMetadata };
      }

      // Fallback if Readability can't parse the content
      // Try to extract content manually
      const fallbackContent = extractContentManually(doc);
      const sanitizedFallback = DOMPurify.sanitize(fallbackContent, {
        ALLOWED_TAGS: [
          'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'em', 'strong',
          'b', 'i', 'u', 'a', 'br', 'hr'
        ],
        ALLOWED_ATTR: ['href', 'title'],
        KEEP_CONTENT: true,
      });
      
      return { cleanedHTML: sanitizedFallback, metadata: null };
    } catch (error) {
      console.error('Error processing content with Readability:', error);
      // Return a simple text fallback
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = DOMPurify.sanitize(html);
      return { 
        cleanedHTML: `<p>${tempDiv.textContent || 'Unable to extract content'}</p>`,
        metadata: null
      };
    }
  }, [html]);
  
  // Call onMetadata in a useEffect to avoid calling setState during render
  useEffect(() => {
    if (metadata && onMetadata) {
      onMetadata(metadata);
    }
  }, [metadata, onMetadata]);

  return (
    <ContentWithHeadingIndicators className={className}>
      <div 
        className="pl-14 prose prose-sm dark:prose-invert max-w-none page-magic-content"
        dangerouslySetInnerHTML={{ __html: cleanedHTML }} 
      />
    </ContentWithHeadingIndicators>
  );
}

function extractContentManually(doc: Document): string {
  // Remove non-content elements
  const selectorsToRemove = [
    'script', 'style', 'nav', 'header', 'footer', 'aside',
    '.sidebar', '.navigation', '.menu', '.ads', '#ads',
    '.cookie-banner', '.popup', '.modal'
  ];

  selectorsToRemove.forEach(selector => {
    doc.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Try to find main content
  const contentSelectors = [
    'main', 'article', '[role="main"]', '#content',
    '.content', '.post-content', '.entry-content'
  ];

  for (const selector of contentSelectors) {
    const element = doc.querySelector(selector);
    if (element && element.textContent && element.textContent.trim().length > 100) {
      return element.innerHTML;
    }
  }

  // Fallback to body
  return doc.body.innerHTML;
}