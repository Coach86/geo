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
      'meta[name="DC.date"]',
      'meta[name="DC.date.created"]',
      'meta[name="DC.date.modified"]',
      'meta[itemprop="datePublished"]',
      'meta[itemprop="dateModified"]',
      'meta[itemprop="dateCreated"]',
      'meta[property="og:updated_time"]',
      'meta[name="last-modified"]',
      'meta[name="revised"]',
    ];

    for (const selector of metaSelectors) {
      const meta = document.querySelector(selector);
      if (meta) {
        const content = meta.getAttribute('content');
        if (content) {
          dateSignals.push(`${selector}: ${content}`);
          if (selector.includes('published') || selector.includes('publish-date') || selector.includes('created')) {
            publishDate = content;
          }
          if (selector.includes('modified') || selector.includes('updated') || selector.includes('revised')) {
            modifiedDate = content;
          }
        }
      }
    }

    // Extract dates from HTML elements with common patterns
    const dateElementSelectors = [
      '.date',
      '.publish-date',
      '.publication-date',
      '.last-updated',
      '.modified-date',
      '.timestamp',
      'time',
      '.date-published',
      '.article-date',
      '.post-date',
      '.updated',
      '.created',
    ];

    for (const selector of dateElementSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent?.trim();
        const datetime = el.getAttribute('datetime');
        
        if (datetime) {
          dateSignals.push(`${selector}[datetime]: ${datetime}`);
          if (!publishDate) publishDate = datetime;
        } else if (text && this.isDateString(text)) {
          dateSignals.push(`${selector}: ${text}`);
          if (!publishDate) publishDate = text;
        }
      });
    }

    // Search for date patterns in text content
    const textDates = this.extractDatesFromText(document.body?.textContent || '');
    textDates.forEach(date => {
      dateSignals.push(`text-pattern: ${date}`);
      if (!publishDate) publishDate = date;
    });

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

    // Use metadata if available (HTTP headers)
    if (metadata?.lastModified) {
      modifiedDate = modifiedDate || metadata.lastModified;
      dateSignals.push(`metadata-modified: ${metadata.lastModified}`);
    }

    return {
      publishDate,
      modifiedDate,
      dateSignals: dateSignals.slice(0, 15), // Increased limit for more signals
    };
  }

  /**
   * Check if a string contains a valid date
   */
  private isDateString(text: string): boolean {
    if (!text || text.length < 4 || text.length > 50) return false;
    
    // Exclude obviously non-date strings
    if (text.includes('copyright') || text.includes('©') || 
        text.includes('all rights reserved') || text.toLowerCase().includes('since')) {
      return false;
    }
    
    // Common date patterns
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/,           // MM/DD/YYYY or DD/MM/YYYY
      /\d{1,2}-\d{1,2}-\d{4}/,             // MM-DD-YYYY or DD-MM-YYYY
      /\d{4}-\d{1,2}-\d{1,2}/,             // YYYY-MM-DD
      /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/i, // DD Mon YYYY
      /\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/i, // French dates
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
    ];

    const hasDatePattern = datePatterns.some(pattern => pattern.test(text));
    
    // Additional validation: try to parse and check if it's a reasonable date
    if (hasDatePattern) {
      try {
        const parsed = new Date(text);
        const year = parsed.getFullYear();
        // Only accept dates between 1990 and current year + 5
        return !isNaN(parsed.getTime()) && year >= 1990 && year <= new Date().getFullYear() + 5;
      } catch {
        return false;
      }
    }
    
    return false;
  }

  /**
   * Extract date patterns from text content
   */
  private extractDatesFromText(text: string): string[] {
    const dates: string[] = [];
    const lines = text.split('\n').slice(0, 50); // Reduced to 50 lines for better performance
    
    const datePatterns = [
      // ISO dates (more restrictive)
      /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})\b/g,
      // French date patterns (specific contexts)
      /(?:publié|modifié|mis à jour|créé).*?\b\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}\b/gi,
      // English date patterns (specific contexts)
      /(?:published|modified|updated|created).*?\b\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/gi,
    ];

    for (const line of lines) {
      // Skip lines that look like copyright or footer content
      if (line.toLowerCase().includes('copyright') || 
          line.toLowerCase().includes('all rights reserved') ||
          line.includes('©')) {
        continue;
      }
      
      for (const pattern of datePatterns) {
        const matches = line.match(pattern);
        if (matches) {
          // Validate each match
          for (const match of matches) {
            if (this.isValidDate(match)) {
              dates.push(match);
              if (dates.length >= 3) break; // Reduced limit
            }
          }
          if (dates.length >= 3) break;
        }
      }
      if (dates.length >= 3) break;
    }

    return [...new Set(dates)]; // Remove duplicates
  }

  /**
   * More strict date validation
   */
  private isValidDate(dateStr: string): boolean {
    try {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return false;
      
      const year = parsed.getFullYear();
      const now = new Date();
      
      // Must be between 2000 and current year + 2
      if (year < 2000 || year > now.getFullYear() + 2) return false;
      
      // Must not be epoch date
      if (parsed.getTime() === 0) return false;
      
      return true;
    } catch {
      return false;
    }
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