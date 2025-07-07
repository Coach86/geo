import { Injectable, Logger } from '@nestjs/common';
import TurndownService from 'turndown';

@Injectable()
export class HtmlToMarkdownService {
  private readonly logger = new Logger(HtmlToMarkdownService.name);
  private readonly turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**',
    });

    // Configure rules for better markdown output
    this.configureRules();
  }

  /**
   * Convert HTML content to Markdown
   */
  convertHtmlToMarkdown(html: string): string {
    try {
      this.logger.log(`Converting HTML to Markdown (${html.length} chars)`);
      
      // Clean up the HTML first
      const cleanedHtml = this.cleanHtml(html);
      
      // Convert to markdown
      const markdown = this.turndownService.turndown(cleanedHtml);
      
      // Post-process markdown
      const processedMarkdown = this.postProcessMarkdown(markdown);
      
      this.logger.log(`Converted to Markdown (${processedMarkdown.length} chars)`);
      
      return processedMarkdown;
    } catch (error) {
      this.logger.error(`Error converting HTML to Markdown: ${error.message}`);
      // Fallback to stripping HTML tags
      return this.stripHtmlTags(html);
    }
  }

  /**
   * Configure Turndown rules for better conversion
   */
  private configureRules(): void {
    // Keep line breaks in content
    this.turndownService.addRule('lineBreaks', {
      filter: 'br',
      replacement: () => '\n',
    });

    // Better handling of divs and paragraphs
    this.turndownService.addRule('divs', {
      filter: ['div'],
      replacement: (content) => '\n\n' + content + '\n\n',
    });

    // Handle spans (usually just pass through content)
    this.turndownService.addRule('spans', {
      filter: 'span',
      replacement: (content) => content,
    });

    // Handle section elements
    this.turndownService.addRule('sections', {
      filter: 'section',
      replacement: (content) => '\n\n' + content + '\n\n',
    });
  }

  /**
   * Clean HTML before conversion
   */
  private cleanHtml(html: string): string {
    // Remove script and style tags
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    
    // Normalize whitespace in tags
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Remove empty paragraphs
    cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
    
    return cleaned;
  }

  /**
   * Post-process markdown to clean it up
   */
  private postProcessMarkdown(markdown: string): string {
    // Remove excessive newlines (more than 2)
    let processed = markdown.replace(/\n{3,}/g, '\n\n');
    
    // Remove trailing spaces
    processed = processed.replace(/ +$/gm, '');
    
    // Fix heading spacing
    processed = processed.replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2');
    
    // Ensure lists have proper spacing
    processed = processed.replace(/^(-|\*|\d+\.)\s+/gm, '$1 ');
    
    // Trim the result
    processed = processed.trim();
    
    return processed;
  }

  /**
   * Fallback: Strip HTML tags if conversion fails
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}