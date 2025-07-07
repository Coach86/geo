import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface StructuredContent {
  title: string;
  content: string;
  excerpt?: string;
  metaDescription?: string;
  byline?: string;
  length: number;
  textContent: string;
  lang?: string;
  publishedTime?: string;
}

@Injectable()
export class StructuredContentService {
  private readonly logger = new Logger(StructuredContentService.name);

  /**
   * Extract structured content from HTML using Mozilla Readability
   */
  extractStructuredContent(html: string, url: string): StructuredContent {
    try {
      this.logger.log(`Starting structured content extraction for URL: ${url}`);
      this.logger.log(`Input HTML length: ${html.length} characters`);

      // Create a DOM from the HTML
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;

      this.logger.log('Created DOM from HTML');
      this.logger.log(`Document title before cleaning: "${document.title}"`);

      // Remove navigation, menu, and other non-content elements before processing
      this.logger.log('Cleaning document - removing navigation and non-content elements...');
      this.cleanDocument(document);

      // Extract meta description
      this.logger.log('Extracting meta description...');
      const metaDescription = this.extractMetaDescription(document);
      this.logger.log(`Meta description: "${metaDescription || 'none found'}"`);

      // Use Readability to extract article content
      this.logger.log('Running Mozilla Readability extraction...');
      const reader = new Readability(document, {
        charThreshold: 100,
        debug: false,
        classesToPreserve: ['content', 'article', 'post', 'entry'],
      });

      const article = reader.parse();

      if (!article) {
        this.logger.warn('Readability failed to parse article, using fallback extraction');
        // Fallback if Readability fails
        return this.extractFallbackContent(document, metaDescription);
      }

      this.logger.log('Readability extraction successful');
      this.logger.log(`Article title: "${article.title}"`);
      this.logger.log(`Article content length: ${article.content?.length || 0} characters`);
      this.logger.log(`Article text content length: ${article.textContent?.length || 0} characters`);
      this.logger.log(`Article excerpt: "${article.excerpt?.substring(0, 100) || 'none'}..."`);

      // Extract meta title if available
      const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || 
                       document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');

      this.logger.log(`Meta title: "${metaTitle || 'none found'}"`);

      const result = {
        title: article.title || metaTitle || document.title || 'Untitled',
        content: article.content || '',
        excerpt: article.excerpt || undefined,
        metaDescription: metaDescription || article.excerpt?.substring(0, 160),
        byline: article.byline || undefined,
        length: article.length || 0,
        textContent: article.textContent || '',
        lang: article.lang || undefined,
        publishedTime: article.publishedTime || undefined,
      };

      this.logger.log(`Final extraction result - Title: "${result.title}"`);
      this.logger.log(`Final extraction result - Text content length: ${result.textContent.length} characters`);
      this.logger.log(`Final extraction result - Content length: ${result.content.length} characters`);

      return result;
    } catch (error) {
      this.logger.error(`Error extracting structured content: ${error.message}`);
      throw new Error(`Failed to extract structured content: ${error.message}`);
    }
  }

  /**
   * Clean document by removing navigation, menu, and other non-content elements
   */
  private cleanDocument(document: Document): void {
    // Remove common non-content elements
    const selectorsToRemove = [
      'nav', 'navigation', 
      '.nav', '.navigation', '.navbar', '.menu', '.menu-item',
      'header', '.header', '.site-header',
      'footer', '.footer', '.site-footer',
      'aside', '.sidebar', '.widget',
      '.breadcrumb', '.breadcrumbs',
      '.social-links', '.social-media',
      '.advertisement', '.ads', '.ad',
      '.newsletter', '.subscription',
      '.comments', '.comment-section',
      '.related-posts', '.related-articles',
      '.tags', '.categories',
      '.author-bio', '.author-info',
      '.share-buttons', '.sharing',
      '.promo', '.promotion', '.banner',
      'script', 'style', 'noscript',
      '.skip-link', '.screen-reader-text',
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '[aria-label="Navigation"]', '[aria-label="Menu"]'
    ];

    selectorsToRemove.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => element.remove());
    });

    // Remove elements with navigation-related text
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      const text = element.textContent?.toLowerCase() || '';
      const tagName = element.tagName.toLowerCase();
      
      // Skip if it's a main content element
      if (['article', 'main', 'section'].includes(tagName)) return;
      
      // Remove if contains navigation keywords
      if (text.includes('navigation') || 
          text.includes('menu') || 
          text.includes('accès à distance') ||
          text.includes('gestion des') ||
          text.includes('contacter') ||
          text.includes('essai gratuit') ||
          text.includes('voir la vidéo')) {
        
        // Only remove if it's a small element (likely navigation)
        if (text.length < 200) {
          element.remove();
        }
      }
    });
  }

  /**
   * Extract meta description from document
   */
  private extractMetaDescription(document: Document): string | undefined {
    // Try different meta description selectors
    const selectors = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[itemprop="description"]',
    ];

    for (const selector of selectors) {
      const meta = document.querySelector(selector);
      if (meta) {
        const content = meta.getAttribute('content');
        if (content && content.trim()) {
          return content.trim();
        }
      }
    }

    return undefined;
  }

  /**
   * Fallback content extraction if Readability fails
   */
  private extractFallbackContent(document: Document, metaDescription?: string): StructuredContent {
    const title = document.title || 'Untitled';
    
    // Remove scripts and styles
    const scripts = document.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());

    // Try to find main content
    const contentSelectors = [
      'main', 'article', '[role="main"]', '#content',
      '.content', '.main-content', '.post-content'
    ];

    let contentElement = document.body;
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.trim().length > 100) {
        contentElement = element as HTMLElement;
        break;
      }
    }

    const textContent = contentElement.textContent || '';
    const content = contentElement.innerHTML || '';

    return {
      title,
      content,
      metaDescription,
      length: textContent.length,
      textContent: textContent.trim(),
    };
  }

  /**
   * Create improved structured content from LLM response
   */
  createImprovedStructuredContent(
    originalStructured: StructuredContent,
    improvedContent: string,
    improvedTitle?: string,
    improvedMetaDescription?: string
  ): StructuredContent {
    return {
      ...originalStructured,
      title: improvedTitle || originalStructured.title,
      content: improvedContent,
      metaDescription: improvedMetaDescription || originalStructured.metaDescription,
      textContent: this.extractTextFromHtml(improvedContent),
      length: improvedContent.length,
    };
  }

  /**
   * Extract plain text from HTML
   */
  private extractTextFromHtml(html: string): string {
    const dom = new JSDOM(html);
    return dom.window.document.body.textContent || '';
  }
}