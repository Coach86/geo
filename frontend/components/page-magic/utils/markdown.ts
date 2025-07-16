import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Renders inline markdown content (no block elements)
 * Useful for titles, meta descriptions, and other inline text
 */
export function renderInlineMarkdown(content: string): string {
  if (!content) return content;
  
  // Configure marked for inline rendering
  marked.setOptions({
    gfm: true,
    breaks: false,
  });
  
  // Convert markdown to HTML
  const rawHtml = marked.parse(content) as string;
  
  // Sanitize and return
  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['em', 'strong', 'b', 'i', 'code'],
    ALLOWED_ATTR: [],
  });
  
  // Remove wrapping <p> tags for inline display
  return sanitizedHtml.replace(/^<p>|<\/p>$/g, '');
}

/**
 * Renders full markdown content with all block elements
 */
export function renderMarkdown(content: string): string {
  if (!content) return '';
  
  // Configure marked options
  marked.setOptions({
    gfm: true,
    breaks: true,
  });
  
  // Convert markdown to HTML
  const rawHtml = marked.parse(content) as string;
  
  // Sanitize the HTML
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'em', 'strong',
      'b', 'i', 'u', 'a', 'br', 'hr', 'table', 'thead', 'tbody',
      'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: ['href', 'title', 'class', 'id'],
    FORBID_TAGS: ['style', 'script', 'img', 'figure', 'figcaption'],
  });
}