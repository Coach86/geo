import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult,
  PageContent,
  Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

interface WikipediaSearchResult {
  pageid: number;
  title: string;
  snippet: string;
  size: number;
  wordcount: number;
  timestamp: string;
}

interface WikipediaPageInfo {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
  categories?: Array<{ title: string }>;
  references?: number;
  externallinks?: string[];
  lastrevid?: number;
  touched?: string;
}

/**
 * Wikipedia Presence Rule - Analyzes brand presence on Wikipedia
 * 
 * This rule searches for Wikipedia articles related to the brand/website
 * and evaluates the quality and authority of the Wikipedia presence.
 */
@Injectable()
export class WikipediaPresenceRule extends BaseAEORule {
  private readonly WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/w/api.php';
  
  constructor() {
    super(
      'wikipedia-presence',
      'Wikipedia Presence',
      'AUTHORITY',
      {
        impactScore: 3, // High impact
        pageTypes: [], // Off-site rule
        isDomainLevel: true // Domain-level analysis
      }
    );
  }
  
  private extractBrandName(url: string): string {
    try {
      const urlObj = new URL(url);
      // Extract domain without TLD
      const domainParts = urlObj.hostname.split('.');
      // Remove common subdomains and TLD
      const brandName = domainParts
        .filter(part => !['www', 'com', 'net', 'org', 'io', 'co', 'uk', 'de', 'fr'].includes(part))
        .join(' ');
      
      // Capitalize first letter of each word
      return brandName.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } catch {
      return url;
    }
  }
  
  private async searchWikipedia(searchTerm: string): Promise<WikipediaSearchResult[]> {
    try {
      const response = await axios.get(this.WIKIPEDIA_API_BASE, {
        params: {
          action: 'query',
          list: 'search',
          srsearch: searchTerm,
          srlimit: 5,
          format: 'json',
          origin: '*'
        },
        timeout: 10000
      });
      
      return response.data?.query?.search || [];
    } catch (error) {
      console.error('Wikipedia search error:', error);
      return [];
    }
  }
  
  private async getPageInfo(pageId: number): Promise<WikipediaPageInfo | null> {
    try {
      const response = await axios.get(this.WIKIPEDIA_API_BASE, {
        params: {
          action: 'query',
          pageids: pageId,
          prop: 'info|extracts|categories|extlinks|revisions',
          inprop: 'url',
          exintro: true,
          explaintext: true,
          exlimit: 1,
          cllimit: 10,
          ellimit: 10,
          rvlimit: 1,
          format: 'json',
          origin: '*'
        },
        timeout: 10000
      });
      
      const pages = response.data?.query?.pages;
      if (pages && pages[pageId]) {
        const page = pages[pageId];
        return {
          pageid: page.pageid,
          title: page.title,
          extract: page.extract,
          fullurl: page.fullurl,
          categories: page.categories,
          externallinks: page.extlinks?.map((link: any) => link['*']),
          lastrevid: page.lastrevid,
          touched: page.touched
        };
      }
      return null;
    } catch (error) {
      console.error('Wikipedia page info error:', error);
      return null;
    }
  }
  
  private isArticleAboutBrand(
    article: WikipediaSearchResult | WikipediaPageInfo,
    brandName: string
  ): boolean {
    const title = article.title.toLowerCase();
    const brand = brandName.toLowerCase();
    
    // Check if title contains brand name
    if (title.includes(brand)) {
      return true;
    }
    
    // Check if it's a company article with brand in title
    const companyVariations = [
      `${brand} (company)`,
      `${brand} inc`,
      `${brand} incorporated`,
      `${brand} corporation`,
      `${brand} ltd`,
      `${brand} limited`
    ];
    
    if (companyVariations.some(variation => title.includes(variation))) {
      return true;
    }
    
    // Check extract/snippet for brand as main subject
    if ('extract' in article && article.extract) {
      const extract = article.extract.toLowerCase();
      const firstSentence = extract.split('.')[0];
      
      // Check if brand is the subject of the first sentence
      if (firstSentence.includes(brand) && 
          (firstSentence.includes(' is ') || firstSentence.includes(' was '))) {
        return true;
      }
    }
    
    if ('snippet' in article && article.snippet) {
      const snippet = article.snippet.toLowerCase().replace(/<[^>]*>/g, '');
      if (snippet.startsWith(brand) || snippet.includes(`${brand} is`)) {
        return true;
      }
    }
    
    // Check categories for business-related terms
    if ('categories' in article && article.categories) {
      const businessCategories = article.categories.some(cat => {
        const catTitle = cat.title.toLowerCase();
        return catTitle.includes('companies') || 
               catTitle.includes('corporations') || 
               catTitle.includes('businesses') ||
               catTitle.includes('software') ||
               catTitle.includes('technology companies');
      });
      
      if (businessCategories && (article.extract?.toLowerCase().includes(brand) || 
                                 article.title.toLowerCase().includes(brand))) {
        return true;
      }
    }
    
    return false;
  }
  
  private calculateScore(
    searchResults: WikipediaSearchResult[],
    pageInfo: WikipediaPageInfo | null,
    brandName: string
  ): number {
    let score = 0;
    
    // Filter results to only those actually about the brand
    const relevantResults = searchResults.filter(result => 
      this.isArticleAboutBrand(result, brandName)
    );
    
    // Base score for having any relevant Wikipedia presence
    if (relevantResults.length > 0) {
      score += 20;
    }
    
    // Check for exact brand match in relevant results
    const exactMatch = relevantResults.find(result => 
      result.title.toLowerCase() === brandName.toLowerCase() ||
      result.title.toLowerCase() === `${brandName.toLowerCase()} (company)`
    );
    if (exactMatch) {
      score += 30;
    }
    
    if (pageInfo) {
      // Article length and quality
      if (pageInfo.extract && pageInfo.extract.length > 500) {
        score += 15;
      }
      if (pageInfo.extract && pageInfo.extract.length > 1000) {
        score += 10;
      }
      
      // Categories indicate article depth
      if (pageInfo.categories && pageInfo.categories.length > 3) {
        score += 10;
      }
      
      // External links indicate references
      if (pageInfo.externallinks && pageInfo.externallinks.length > 2) {
        score += 10;
      }
      
      // Recent updates indicate maintained article
      if (pageInfo.touched) {
        const lastUpdate = new Date(pageInfo.touched);
        const monthsAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsAgo < 12) {
          score += 5;
        }
      }
    }
    
    return Math.min(score, 100);
  }
  
  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const details: Record<string, any> = {};
    
    // Extract brand name from URL
    const brandName = this.extractBrandName(url);
    details.searchedBrand = brandName;
    
    let relevantPageInfo: WikipediaPageInfo | null = null;
    let searchResults: WikipediaSearchResult[] = [];
    
    try {
      // Search Wikipedia for the brand
      searchResults = await this.searchWikipedia(brandName);
      details.searchResultsCount = searchResults.length;
      
      if (searchResults.length === 0) {
        evidence.push(EvidenceHelper.info(`No Wikipedia articles found for "${brandName}"`));
        details.hasWikipediaPresence = false;
      } else {
        // Filter for relevant results
        const relevantResults = searchResults.filter(result => 
          this.isArticleAboutBrand(result, brandName)
        );
        
        evidence.push(EvidenceHelper.info(`Found ${searchResults.length} search results for "${brandName}"`));
        
        if (relevantResults.length === 0) {
          evidence.push(EvidenceHelper.error(`None of the results are about the brand "${brandName}"`));
          details.hasWikipediaPresence = false;
          
          // Show why top results were rejected
          searchResults.slice(0, 2).forEach(result => {
            evidence.push(EvidenceHelper.info(`  • "${result.title}" - Not about the brand`));
          });
        } else {
          evidence.push(EvidenceHelper.success(`Found ${relevantResults.length} Wikipedia article(s) about "${brandName}"`));
          details.hasWikipediaPresence = true;
          details.searchResults = relevantResults.map(r => ({
            title: r.title,
            snippet: r.snippet.replace(/<[^>]*>/g, ''), // Remove HTML tags
            size: r.size,
            wordcount: r.wordcount
          }));
          
          // Get detailed info for the most relevant result
          const mostRelevant = relevantResults[0];
          
          if (mostRelevant) {
            const pageInfo = await this.getPageInfo(mostRelevant.pageid);
          
            if (pageInfo && this.isArticleAboutBrand(pageInfo, brandName)) {
              relevantPageInfo = pageInfo;
              evidence.push(EvidenceHelper.info(`Primary Wikipedia article: "${pageInfo.title}"`));
              
              if (pageInfo.extract) {
                const wordCount = pageInfo.extract.split(' ').length;
                evidence.push(EvidenceHelper.info(`Article contains ${wordCount} words in the introduction`));
                details.articleWordCount = wordCount;
              }
              
              if (pageInfo.categories) {
                evidence.push(EvidenceHelper.info(`Article has ${pageInfo.categories.length} categories`));
                details.categories = pageInfo.categories.map(c => c.title);
              }
              
              if (pageInfo.externallinks) {
                evidence.push(EvidenceHelper.info(`Article contains ${pageInfo.externallinks.length} external references`));
                details.externalLinksCount = pageInfo.externallinks.length;
              }
              
              if (pageInfo.fullurl) {
                details.wikipediaUrl = pageInfo.fullurl;
              }
              
              if (pageInfo.touched) {
                const lastUpdate = new Date(pageInfo.touched);
                evidence.push(EvidenceHelper.info(`Article last updated: ${lastUpdate.toLocaleDateString()}`));
                details.lastUpdated = pageInfo.touched;
              }
            } else if (pageInfo) {
              evidence.push(EvidenceHelper.error(`Article "${pageInfo.title}" is not about the brand`));
              details.hasWikipediaPresence = false;
            }
          }
        }
      }
      
      // Alternative brand names search
      const alternativeSearches = [
        brandName.replace(/\s+/g, ''),
        brandName + ' company',
        brandName + ' corporation'
      ];
      
      for (const altSearch of alternativeSearches) {
        if (altSearch !== brandName) {
          const altResults = await this.searchWikipedia(altSearch);
          if (altResults.length > 0 && searchResults.length === 0) {
            evidence.push(EvidenceHelper.info(`Found results with alternative search: "${altSearch}"`));
            details.alternativeSearchResults = altResults.slice(0, 2).map(r => r.title);
          }
        }
      }
      
    } catch (error) {
      evidence.push(EvidenceHelper.info('Error accessing Wikipedia API'));
      details.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // Calculate score based on relevant results only
    const relevantResults = searchResults.filter(result => 
      this.isArticleAboutBrand(result, brandName)
    );
    
    const score = this.calculateScore(
      relevantResults,
      relevantPageInfo,
      brandName
    );
    
    // Set additional details
    details.score = score;
    details.analysisType = 'off-site';
    details.criteria = 'Authority Building';
    details.element = 'Wikipedia Presence';
    details.applicationLevel = 'Off-Site';
    details.seoLlmType = 'SEO adapted to LLM';
    details.impact = 'High';
    details.importance = 'Wikipedia presence provides authoritative third-party validation and enhances brand credibility in search results.';
    details.checklist = [
      'Company Wikipedia page exists',
      'Article is comprehensive and well-sourced',
      'Regular updates and maintenance',
      'Proper citations and references',
      'Neutral point of view maintained'
    ];
    
    const issues = [];
    if (score < 20) {
      issues.push({
        severity: 'high' as const,
        description: 'No Wikipedia presence found for the brand',
        recommendation: '<target>Consider creating a Wikipedia article following notability guidelines and ensuring proper sourcing</target>'
      });
    } else if (score < 50) {
      issues.push({
        severity: 'medium' as const,
        description: 'Limited Wikipedia presence or article quality',
        recommendation: '<target>Improve Wikipedia article with more comprehensive content, reliable sources, and regular updates</target>'
      });
    } else if (score < 80) {
      issues.push({
        severity: 'low' as const,
        description: 'Wikipedia presence exists but could be enhanced',
        recommendation: '<target>Enhance article with additional references, categories, and maintain regular updates</target>'
      });
    }
    
    // Calculate score breakdown
    let scoreBreakdown = 'Base: 0';
    const relevantCount = relevantResults.length;
    if (relevantCount > 0) scoreBreakdown += ', Wikipedia Presence: +20';
    const exactMatch = relevantResults.find(r => r.title.toLowerCase() === brandName.toLowerCase() || r.title.toLowerCase() === `${brandName.toLowerCase()} (company)`);
    if (exactMatch) scoreBreakdown += ', Exact Match: +30';
    if (relevantPageInfo) {
      if (relevantPageInfo.extract && relevantPageInfo.extract.length > 500) scoreBreakdown += ', Article Length (500+): +15';
      if (relevantPageInfo.extract && relevantPageInfo.extract.length > 1000) scoreBreakdown += ', Article Length (1000+): +10';
      if (relevantPageInfo.categories && relevantPageInfo.categories.length > 3) scoreBreakdown += ', Categories: +10';
      if (relevantPageInfo.externallinks && relevantPageInfo.externallinks.length > 2) scoreBreakdown += ', External Links: +10';
      const lastUpdate = relevantPageInfo.touched ? new Date(relevantPageInfo.touched) : null;
      if (lastUpdate && (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30) < 12) scoreBreakdown += ', Recent Update: +5';
    }
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (${scoreBreakdown})`));
    
    return this.createResult(score, evidence, issues, details);
  }
}