import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';

export interface PageSignals {
  content: {
    title: string;
    cleanText: string;
    wordCount: number;
    avgSentenceLength: number;
  };
  structure: {
    h1Count: number;
    headingHierarchy: string[];
    listCount: number;
    schemaTypes: string[];
  };
  authority: {
    authorElements: string[];
    outboundLinks: string[];
    citationCandidates: string[];
  };
  freshness: {
    publishDate?: string;
    modifiedDate?: string;
    dateSignals: string[];
  };
}

@Injectable()
export class PageSignalExtractorService {
  private readonly logger = new Logger(PageSignalExtractorService.name);
  private readonly MAX_CONTENT_LENGTH = 10000; // 10KB limit for clean content

  /**
   * Extract structured signals from HTML for LLM analysis
   */
  extract(html: string, metadata?: any): PageSignals {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      return {
        content: this.extractContentSignals(document),
        structure: this.extractStructureSignals(document),
        authority: this.extractAuthoritySignals(document),
        freshness: this.extractFreshnessSignals(document, metadata),
      };
    } catch (error) {
      this.logger.error('Error extracting page signals:', error);
      return this.getEmptySignals();
    }
  }

  /**
   * Get clean, boilerplate-free content for token optimization
   */
  getCleanContent(html: string): string {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Remove unwanted elements
      this.removeUnwantedElements(document);

      // Extract main content using readability-like algorithm
      const mainContent = this.extractMainContent(document);
      
      // Clean and truncate
      const cleanText = this.cleanText(mainContent);
      
      return cleanText.length > this.MAX_CONTENT_LENGTH 
        ? cleanText.substring(0, this.MAX_CONTENT_LENGTH) + '...'
        : cleanText;
    } catch (error) {
      this.logger.error('Error cleaning content:', error);
      return '';
    }
  }

  private extractContentSignals(document: Document): PageSignals['content'] {
    // Get title
    const titleElement = document.querySelector('title, h1');
    const title = titleElement?.textContent?.trim() || '';

    // Extract clean text
    this.removeUnwantedElements(document);
    const mainContent = this.extractMainContent(document);
    const cleanText = this.cleanText(mainContent);

    // Calculate metrics
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      title,
      cleanText: cleanText.substring(0, this.MAX_CONTENT_LENGTH),
      wordCount: words.length,
      avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
    };
  }

  private extractStructureSignals(document: Document): PageSignals['structure'] {
    // Count H1 elements
    const h1Elements = document.querySelectorAll('h1');
    const h1Count = h1Elements.length;

    // Extract heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingHierarchy = Array.from(headings)
      .slice(0, 10) // Limit to first 10 headings
      .map(h => `${h.tagName.toLowerCase()}: ${h.textContent?.trim().substring(0, 100) || ''}`);

    // Count lists
    const lists = document.querySelectorAll('ul, ol');
    const listCount = lists.length;

    // Extract schema types
    const schemaElements = document.querySelectorAll('[itemtype], script[type="application/ld+json"]');
    const schemaTypes = Array.from(schemaElements)
      .map(el => {
        if (el.getAttribute('itemtype')) {
          return el.getAttribute('itemtype') || '';
        }
        // Try to parse JSON-LD
        try {
          const jsonLd = JSON.parse(el.textContent || '');
          return jsonLd['@type'] || '';
        } catch {
          return '';
        }
      })
      .filter(type => type.length > 0)
      .slice(0, 5); // Limit to 5 schema types

    return {
      h1Count,
      headingHierarchy,
      listCount,
      schemaTypes,
    };
  }

  private extractAuthoritySignals(document: Document): PageSignals['authority'] {
    // Find author elements
    const authorSelectors = [
      '[rel="author"]',
      '.author',
      '.byline',
      '[itemprop="author"]',
      'meta[name="author"]',
    ];
    
    const authorElements: string[] = [];
    for (const selector of authorSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent?.trim() || el.getAttribute('content')?.trim() || '';
        if (text && text.length > 0 && text.length < 200) {
          authorElements.push(text);
        }
      });
    }

    // Find outbound links
    const links = document.querySelectorAll('a[href^="http"]');
    const outboundLinks = Array.from(links)
      .map(link => link.getAttribute('href') || '')
      .filter(href => href.length > 0)
      .slice(0, 20); // Limit to 20 links

    // Find citation candidates (links with certain patterns)
    const citationCandidates = outboundLinks.filter(href => {
      const url = href.toLowerCase();
      return url.includes('doi.org') || 
             url.includes('pubmed') || 
             url.includes('arxiv') || 
             url.includes('scholar.google') ||
             url.includes('researchgate') ||
             url.includes('nature.com') ||
             url.includes('sciencedirect') ||
             url.includes('wikipedia.org');
    });

    return {
      authorElements: [...new Set(authorElements)].slice(0, 5),
      outboundLinks: [...new Set(outboundLinks)],
      citationCandidates,
    };
  }

  private extractFreshnessSignals(document: Document, metadata?: any): PageSignals['freshness'] {
    const dateSignals: string[] = [];
    let publishDate: string | undefined;
    let modifiedDate: string | undefined;

    // Extract dates from meta tags
    const metaSelectors = [
      'meta[property="article:published_time"]',
      'meta[property="article:modified_time"]',
      'meta[name="publish-date"]',
      'meta[name="date"]',
      'meta[itemprop="datePublished"]',
      'meta[itemprop="dateModified"]',
    ];

    for (const selector of metaSelectors) {
      const meta = document.querySelector(selector);
      if (meta) {
        const content = meta.getAttribute('content');
        if (content) {
          dateSignals.push(`${selector}: ${content}`);
          if (selector.includes('published') || selector.includes('publish-date')) {
            publishDate = content;
          }
          if (selector.includes('modified')) {
            modifiedDate = content;
          }
        }
      }
    }

    // Extract dates from JSON-LD
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data.datePublished) {
          publishDate = publishDate || data.datePublished;
          dateSignals.push(`json-ld-published: ${data.datePublished}`);
        }
        if (data.dateModified) {
          modifiedDate = modifiedDate || data.dateModified;
          dateSignals.push(`json-ld-modified: ${data.dateModified}`);
        }
      } catch {
        // Ignore invalid JSON-LD
      }
    });

    // Use metadata if available
    if (metadata?.lastModified) {
      modifiedDate = modifiedDate || metadata.lastModified;
      dateSignals.push(`metadata-modified: ${metadata.lastModified}`);
    }

    return {
      publishDate,
      modifiedDate,
      dateSignals: dateSignals.slice(0, 10), // Limit to 10 date signals
    };
  }

  private removeUnwantedElements(document: Document): void {
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      '.sidebar',
      '.navigation',
      '.menu',
      '.breadcrumb',
      '.advertisement',
      '.ads',
      '.popup',
      '.modal',
      '.cookie-notice',
      '[role="banner"]',
      '[role="navigation"]',
      '[role="complementary"]',
      '[role="contentinfo"]',
    ];

    unwantedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
  }

  private extractMainContent(document: Document): string {
    // Try to find main content area using common selectors
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.post-content',
      '.entry-content',
      'article',
      '.article-body',
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.trim().length > 200) {
        return element.textContent;
      }
    }

    // Fallback: use body content
    const body = document.querySelector('body');
    return body?.textContent || '';
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }

  private getEmptySignals(): PageSignals {
    return {
      content: {
        title: '',
        cleanText: '',
        wordCount: 0,
        avgSentenceLength: 0,
      },
      structure: {
        h1Count: 0,
        headingHierarchy: [],
        listCount: 0,
        schemaTypes: [],
      },
      authority: {
        authorElements: [],
        outboundLinks: [],
        citationCandidates: [],
      },
      freshness: {
        dateSignals: [],
      },
    };
  }
}