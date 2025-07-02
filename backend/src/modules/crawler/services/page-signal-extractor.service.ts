import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { PageSignals } from '../interfaces/page-signals.interface';

@Injectable()
export class PageSignalExtractorService {
  private readonly logger = new Logger(PageSignalExtractorService.name);
  private readonly MAX_CONTENT_LENGTH = 25000; // Token optimization

  /**
   * Extract structured signals from HTML for LLM analysis
   */
  extract(html: string, metadata?: any, brandContext?: { brandName: string; keyBrandAttributes: string[]; competitors: string[] }): PageSignals {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      return {
        content: this.extractContentSignals(document),
        structure: this.extractStructureSignals(document),
        freshness: this.extractFreshnessSignals(document, metadata),
        brand: this.extractBrandSignals(document, brandContext),
        snippet: this.extractSnippetSignals(document)
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
    // Get h1 text
    const h1Element = document.querySelector('h1');
    const h1Text = h1Element?.textContent?.trim() || '';
    
    // Get meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    const metaDescription = metaDesc?.getAttribute('content') || '';

    // Extract clean text
    const mainContent = this.extractMainContent(document);
    const cleanText = this.cleanText(mainContent);

    // Calculate metrics
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Check for author information
    const authorSelectors = [
      '[rel="author"]',
      '.author',
      '.byline',
      '[itemprop="author"]',
      'meta[name="author"]',
    ];
    
    let hasAuthor = false;
    let authorName = '';
    for (const selector of authorSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        hasAuthor = true;
        authorName = element.textContent?.trim() || element.getAttribute('content')?.trim() || '';
        break;
      }
    }

    // Check for byline and author bio
    const hasByline = !!document.querySelector('.byline, .author-byline, [class*="byline"]');
    const hasAuthorBio = !!document.querySelector('.author-bio, .author-description, [class*="author-bio"]');

    // Count citations and links
    const allLinks = document.querySelectorAll('a[href]');
    let citationCount = 0;
    let internalLinkCount = 0;
    let externalLinkCount = 0;
    let hasSources = false;
    let hasReferences = false;
    let academicSourceCount = 0;
    let newsSourceCount = 0;
    let industrySourceCount = 0;

    Array.from(allLinks).forEach(link => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent?.toLowerCase() || '';
      
      if (href.startsWith('http')) {
        externalLinkCount++;
        
        // Check for academic sources
        if (href.includes('.edu') || href.includes('scholar.') || href.includes('pubmed')) {
          academicSourceCount++;
        }
        // Check for news sources
        if (href.includes('news') || href.includes('times') || href.includes('post')) {
          newsSourceCount++;
        }
      } else {
        internalLinkCount++;
      }
      
      // Check for citation markers
      if (text.includes('cite') || text.includes('source') || link.getAttribute('rel')?.includes('cite')) {
        citationCount++;
      }
    });

    // Check for sources/references sections
    const allText = document.body?.textContent?.toLowerCase() || '';
    hasSources = allText.includes('sources:') || allText.includes('source:');
    hasReferences = allText.includes('references:') || allText.includes('bibliography:');

    return {
      h1Text,
      metaDescription,
      wordCount: words.length,
      hasAuthor,
      hasByline,
      hasAuthorBio,
      authorName: authorName.substring(0, 100),
      citationCount,
      internalLinkCount,
      externalLinkCount,
      hasSources,
      hasReferences,
      academicSourceCount,
      newsSourceCount,
      industrySourceCount: externalLinkCount - academicSourceCount - newsSourceCount
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

    const hasSchema = schemaTypes.length > 0;

    // Calculate readability metrics
    const mainContent = this.extractMainContent(document);
    const cleanText = this.cleanText(mainContent);
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceWords = sentences.length > 0 ? words.length / sentences.length : 0;

    // Calculate heading hierarchy score (0-100)
    let headingHierarchyScore = 0;
    if (h1Count === 1) headingHierarchyScore += 50;
    if (headings.length > 3 && headings.length < 20) headingHierarchyScore += 30;
    // Check for proper hierarchy (h1 -> h2 -> h3)
    let properHierarchy = true;
    let lastLevel = 0;
    Array.from(headings).forEach(h => {
      const level = parseInt(h.tagName.charAt(1));
      if (level - lastLevel > 1) properHierarchy = false;
      lastLevel = level;
    });
    if (properHierarchy) headingHierarchyScore += 20;

    return {
      h1Count,
      headingHierarchy,
      listCount,
      schemaTypes,
      hasSchema,
      wordCount: words.length,
      avgSentenceWords: Math.round(avgSentenceWords),
      headingHierarchyScore
    };
  }

  private extractFreshnessSignals(document: Document, metadata?: any): PageSignals['freshness'] {
    let publishDate: Date | undefined;
    let modifiedDate: Date | undefined;
    const updateIndicators: string[] = [];
    let hasDateInUrl = false;
    let hasDateInTitle = false;
    let yearMentionCount = 0;

    // Check metadata first
    if (metadata?.publishDate) {
      publishDate = new Date(metadata.publishDate);
    }
    if (metadata?.modifiedDate) {
      modifiedDate = new Date(metadata.modifiedDate);
    }

    // Look for dates in meta tags
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[property="article:modified_time"]',
      'meta[name="publish_date"]',
      'meta[name="last_modified"]',
      'time[datetime]',
      '[itemprop="datePublished"]',
      '[itemprop="dateModified"]'
    ];

    dateSelectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        const dateStr = element.getAttribute('content') || 
                       element.getAttribute('datetime') || 
                       element.textContent;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            if (selector.includes('published') && !publishDate) {
              publishDate = date;
            } else if (selector.includes('modified') && !modifiedDate) {
              modifiedDate = date;
            }
          }
        }
      }
    });

    // Check URL for date patterns
    const urlDatePattern = /\/(20\d{2})[\/\-](0?[1-9]|1[0-2])[\/\-]/;
    if (metadata?.url && urlDatePattern.test(metadata.url)) {
      hasDateInUrl = true;
    }

    // Check title for date/year
    const title = document.querySelector('title')?.textContent || '';
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 5; year--) {
      if (title.includes(year.toString())) {
        hasDateInTitle = true;
        break;
      }
    }

    // Count year mentions in content
    const bodyText = document.body?.textContent || '';
    for (let year = currentYear; year >= currentYear - 10; year--) {
      const yearRegex = new RegExp(`\\b${year}\\b`, 'g');
      const matches = bodyText.match(yearRegex);
      if (matches) {
        yearMentionCount += matches.length;
      }
    }

    // Look for update indicators
    const updatePatterns = ['updated', 'revised', 'last modified', 'last updated'];
    updatePatterns.forEach(pattern => {
      if (bodyText.toLowerCase().includes(pattern)) {
        updateIndicators.push(pattern);
      }
    });

    // Calculate content age
    let contentAge: number | undefined;
    if (publishDate) {
      contentAge = Math.floor((Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      publishDate,
      modifiedDate,
      hasDateInUrl,
      hasDateInTitle,
      yearMentionCount,
      updateIndicators,
      contentAge
    };
  }

  private extractBrandSignals(document: Document, brandContext?: { brandName: string; keyBrandAttributes: string[]; competitors: string[] }): PageSignals['brand'] {
    if (!brandContext || !brandContext.brandName) {
      // Without brand context, can't extract meaningful signals
      return {
        brandMentionCount: 0,
        competitorMentionCount: 0,
        brandInTitle: false,
        brandInH1: false,
        brandInUrl: false,
        brandProminence: 0,
        contextQuality: []
      };
    }

    const { brandName, keyBrandAttributes, competitors } = brandContext;
    const bodyText = document.body?.textContent || '';
    const titleText = document.querySelector('title')?.textContent || '';
    const h1Text = document.querySelector('h1')?.textContent || '';

    // Count brand mentions
    const brandRegex = new RegExp(`\\b${brandName}\\b`, 'gi');
    const brandMatches = bodyText.match(brandRegex) || [];
    const brandMentionCount = brandMatches.length;

    // Count competitor mentions
    let competitorMentionCount = 0;
    competitors.forEach(competitor => {
      const competitorRegex = new RegExp(`\\b${competitor}\\b`, 'gi');
      const matches = bodyText.match(competitorRegex) || [];
      competitorMentionCount += matches.length;
    });

    // Check brand presence in key locations
    const brandInTitle = brandRegex.test(titleText);
    const brandInH1 = brandRegex.test(h1Text);
    const brandInUrl = false; // URL not available in document

    // Calculate brand prominence (percentage of brand mentions vs total words)
    const totalWords = bodyText.split(/\s+/).filter(word => word.length > 0).length;
    const brandProminence = totalWords > 0 ? (brandMentionCount / totalWords) * 100 : 0;

    // Find which key brand attributes are mentioned
    const contextQuality: string[] = [];
    keyBrandAttributes.forEach(attribute => {
      const attrRegex = new RegExp(`\\b${attribute}\\b`, 'gi');
      if (attrRegex.test(bodyText)) {
        contextQuality.push(attribute);
      }
    });

    return {
      brandMentionCount,
      competitorMentionCount,
      brandInTitle,
      brandInH1,
      brandInUrl,
      brandProminence: Math.round(brandProminence * 100) / 100,
      contextQuality
    };
  }

  private extractSnippetSignals(document: Document): PageSignals['snippet'] {
    // Count Q&A blocks
    const qaSelectors = [
      '.faq', '[class*="question"]', '[class*="answer"]',
      '[itemtype*="FAQPage"]', '[itemtype*="Question"]'
    ];
    let qaBlockCount = 0;
    qaSelectors.forEach(selector => {
      qaBlockCount += document.querySelectorAll(selector).length;
    });

    // Count list items
    const listItemCount = document.querySelectorAll('li').length;

    // Calculate average sentence length
    const mainContent = this.extractMainContent(document);
    const cleanText = this.cleanText(mainContent);
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const avgSentenceLength = sentences.length > 0 
      ? sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length 
      : 0;

    // Count definitions
    const definitionSelectors = ['dl', 'dt', 'dd', '[class*="definition"]'];
    let definitionCount = 0;
    definitionSelectors.forEach(selector => {
      definitionCount += document.querySelectorAll(selector).length;
    });

    // Check for structured data
    const hasStructuredData = document.querySelectorAll(
      'script[type="application/ld+json"], [itemscope]'
    ).length > 0;

    // Count steps and bullet points
    const stepCount = document.querySelectorAll(
      '[class*="step"], .step, ol > li'
    ).length;
    const bulletPoints = document.querySelectorAll('ul > li').length;

    return {
      qaBlockCount,
      listItemCount,
      avgSentenceLength: Math.round(avgSentenceLength),
      definitionCount,
      hasStructuredData,
      stepCount,
      bulletPoints
    };
  }

  private removeUnwantedElements(document: Document): void {
    const unwantedSelectors = [
      'script', 'style', 'noscript', 'iframe', 
      'nav', 'header', 'footer', 'aside',
      '[class*="sidebar"]', '[class*="advertisement"]',
      '[class*="social"]', '[class*="share"]'
    ];

    unwantedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
  }

  private extractMainContent(document: Document): string {
    // Try to find main content containers
    const contentSelectors = [
      'main', 'article', '[role="main"]',
      '.content', '#content', '.main-content'
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent || '';
      }
    }

    // Fallback to body
    return document.body?.textContent || '';
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
  }

  private getEmptySignals(): PageSignals {
    return {
      content: {
        h1Text: '',
        metaDescription: '',
        wordCount: 0,
        hasAuthor: false,
        hasByline: false,
        hasAuthorBio: false,
        citationCount: 0,
        internalLinkCount: 0,
        externalLinkCount: 0,
        hasSources: false,
        hasReferences: false,
        academicSourceCount: 0,
        newsSourceCount: 0,
        industrySourceCount: 0
      },
      structure: {
        h1Count: 0,
        headingHierarchy: [],
        listCount: 0,
        schemaTypes: [],
        hasSchema: false,
        wordCount: 0,
        avgSentenceWords: 0,
        headingHierarchyScore: 0
      },
      freshness: {
        hasDateInUrl: false,
        hasDateInTitle: false,
        yearMentionCount: 0,
        updateIndicators: []
      },
      brand: {
        brandMentionCount: 0,
        competitorMentionCount: 0,
        brandInTitle: false,
        brandInH1: false,
        brandInUrl: false,
        brandProminence: 0,
        contextQuality: []
      },
      snippet: {
        qaBlockCount: 0,
        listItemCount: 0,
        avgSentenceLength: 0,
        definitionCount: 0,
        hasStructuredData: false,
        stepCount: 0,
        bulletPoints: 0
      }
    };
  }
}