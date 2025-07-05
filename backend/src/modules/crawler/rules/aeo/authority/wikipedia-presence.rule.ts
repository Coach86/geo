import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult,
  PageContent,
  Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

// Evidence topics for this rule
enum WikipediaPresenceTopic {
  SEARCH_RESULTS = 'Wikipedia Search Results',
  ARTICLE_FOUND = 'Wikipedia Article Found',
  ARTICLE_DETAILS = 'Article Quality Analysis',
  NO_ARTICLES = 'No Wikipedia Presence',
  ALTERNATIVE_SEARCH = 'Alternative Search Attempts'
}

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
      const hostname = new URL(url).hostname;
      // Remove www prefix
      let brand = hostname.replace(/^www\./, '');
      
      // Remove common TLDs - handle country codes like .fr, .de, .uk
      brand = brand.replace(/\.(com|org|net|io|co|ai|app|dev|fr|de|uk|es|it|nl|be|ch|at)$/i, '');
      
      // If there are still dots, take the first part (main domain)
      const parts = brand.split('.');
      brand = parts.length > 1 ? parts[0] : brand;
      
      // Capitalize first letter
      return brand.charAt(0).toUpperCase() + brand.slice(1);
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
    
    // Base score for having any relevant Wikipedia presence (50 points)
    if (relevantResults.length > 0) {
      score += 50;
    }
    
    // No additional points for exact match - it's included in the base 50
    
    if (pageInfo) {
      // Article length and quality (up to 20 points)
      if (pageInfo.extract) {
        const wordCount = pageInfo.extract.split(' ').length;
        if (wordCount > 500) {
          score += 20;
        } else if (wordCount > 200) {
          score += 10;
        } else {
          score += 5;
        }
      }
      
      // Categories indicate article depth (up to 15 points)
      if (pageInfo.categories) {
        if (pageInfo.categories.length > 3) {
          score += 15;
        } else if (pageInfo.categories.length > 0) {
          score += 8;
        }
      }
      
      // External links indicate references (up to 10 points)
      if (pageInfo.externallinks) {
        if (pageInfo.externallinks.length > 2) {
          score += 10;
        } else if (pageInfo.externallinks.length > 0) {
          score += 5;
        }
      }
      
      // Recent updates indicate maintained article (5 points)
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
        evidence.push(EvidenceHelper.error(WikipediaPresenceTopic.NO_ARTICLES, `No Wikipedia articles found for "${brandName}"`, { score: 0 }));
        details.hasWikipediaPresence = false;
      } else {
        // Filter for relevant results
        const relevantResults = searchResults.filter(result => 
          this.isArticleAboutBrand(result, brandName)
        );
        
        // Show search results with code snippet
        const searchResultsList = searchResults.slice(0, 3).map(result => 
          `• "${result.title}": ${result.snippet.replace(/<[^>]*>/g, '').substring(0, 100)}...`
        ).join('\n');
        evidence.push(EvidenceHelper.info(WikipediaPresenceTopic.SEARCH_RESULTS, `Found ${searchResults.length} search results for "${brandName}"`, {
          code: searchResultsList
        }));
        
        if (relevantResults.length === 0) {
          evidence.push(EvidenceHelper.error(WikipediaPresenceTopic.NO_ARTICLES, `None of the results are about the brand "${brandName}"`, { score: 0 }));
          details.hasWikipediaPresence = false;
          
          // Show code snippet of what was actually found
          const topResults = searchResults.slice(0, 2);
          if (topResults.length > 0) {
            const resultSnippets = topResults.map(result => 
              `"${result.title}": ${result.snippet.replace(/<[^>]*>/g, '').substring(0, 100)}...`
            ).join('\n');
            evidence.push(EvidenceHelper.info(WikipediaPresenceTopic.SEARCH_RESULTS, 'Search returned these results instead:', {
              code: resultSnippets
            }));
          }
          
          // Show why top results were rejected
          searchResults.slice(0, 2).forEach(result => {
            evidence.push(EvidenceHelper.info(WikipediaPresenceTopic.SEARCH_RESULTS, `  • "${result.title}" - Not about the brand`));
          });
        } else {
          const baseScore = 50; // Base score for having Wikipedia presence
          evidence.push(EvidenceHelper.success(WikipediaPresenceTopic.ARTICLE_FOUND, `Found ${relevantResults.length} Wikipedia article(s) about "${brandName}"`, { score: baseScore }));
          details.hasWikipediaPresence = true;
          details.searchResults = relevantResults.map(r => ({
            title: r.title,
            snippet: r.snippet.replace(/<[^>]*>/g, ''), // Remove HTML tags
            size: r.size,
            wordcount: r.wordcount
          }));
          
          // Show URLs of found articles in code snippet
          const articleUrls = relevantResults.map(result => 
            `• "${result.title}": https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`
          ).join('\n');
          evidence.push(EvidenceHelper.info(WikipediaPresenceTopic.ARTICLE_FOUND, 'Wikipedia articles found:', {
            code: articleUrls
          }));
          
          // Get detailed info for the most relevant result
          const mostRelevant = relevantResults[0];
          
          if (mostRelevant) {
            const pageInfo = await this.getPageInfo(mostRelevant.pageid);
          
            if (pageInfo && this.isArticleAboutBrand(pageInfo, brandName)) {
              relevantPageInfo = pageInfo;
              const primaryUrl = pageInfo.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageInfo.title.replace(/ /g, '_'))}`;
              evidence.push(EvidenceHelper.success(WikipediaPresenceTopic.ARTICLE_FOUND, `Primary Wikipedia article: "${pageInfo.title}"`, {
                code: `Primary article URL: ${primaryUrl}`
              }));
              
              if (pageInfo.extract) {
                const wordCount = pageInfo.extract.split(' ').length;
                let qualityScore = wordCount > 500 ? 20 : (wordCount > 200 ? 10 : 5);
                evidence.push(EvidenceHelper.info(WikipediaPresenceTopic.ARTICLE_DETAILS, `Article contains ${wordCount} words in the introduction`, { score: qualityScore }));
                details.articleWordCount = wordCount;
              }
              
              if (pageInfo.categories) {
                const categoryScore = pageInfo.categories.length > 3 ? 15 : (pageInfo.categories.length > 0 ? 8 : 0);
                evidence.push(EvidenceHelper.info(WikipediaPresenceTopic.ARTICLE_DETAILS, `Article has ${pageInfo.categories.length} categories`, { score: categoryScore }));
                details.categories = pageInfo.categories.map(c => c.title);
              }
              
              if (pageInfo.externallinks) {
                const linkScore = pageInfo.externallinks.length > 2 ? 10 : (pageInfo.externallinks.length > 0 ? 5 : 0);
                evidence.push(EvidenceHelper.info(WikipediaPresenceTopic.ARTICLE_DETAILS, `Article contains ${pageInfo.externallinks.length} external references`, { score: linkScore }));
                details.externalLinksCount = pageInfo.externallinks.length;
              }
              
              if (pageInfo.fullurl) {
                details.wikipediaUrl = pageInfo.fullurl;
              }
              
              if (pageInfo.touched) {
                const lastUpdate = new Date(pageInfo.touched);
                const monthsAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
                const freshnessScore = monthsAgo < 12 ? 5 : 0;
                evidence.push(EvidenceHelper.info(WikipediaPresenceTopic.ARTICLE_DETAILS, `Article last updated: ${lastUpdate.toLocaleDateString()}`, { score: freshnessScore }));
                details.lastUpdated = pageInfo.touched;
              }
            } else if (pageInfo) {
              evidence.push(EvidenceHelper.error(WikipediaPresenceTopic.NO_ARTICLES, `Article "${pageInfo.title}" is not about the brand`, { score: 0 }));
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
            evidence.push(EvidenceHelper.info(WikipediaPresenceTopic.ALTERNATIVE_SEARCH, `Found results with alternative search: "${altSearch}"`));
            details.alternativeSearchResults = altResults.slice(0, 2).map(r => r.title);
            
            // Show alternative search URLs
            const altUrls = altResults.slice(0, 2).map(result => 
              `• "${result.title}": https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`
            ).join('\n');
            evidence.push(EvidenceHelper.info(WikipediaPresenceTopic.ALTERNATIVE_SEARCH, 'Alternative search results:', {
              code: altUrls
            }));
          }
        }
      }
      
    } catch (error) {
      evidence.push(EvidenceHelper.error(WikipediaPresenceTopic.SEARCH_RESULTS, 'Error accessing Wikipedia API', { score: 0 }));
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
        recommendation: 'Consider creating a Wikipedia article following notability guidelines and ensuring proper sourcing'
      });
    } else if (score < 50) {
      issues.push({
        severity: 'medium' as const,
        description: 'Limited Wikipedia presence or article quality',
        recommendation: 'Improve Wikipedia article with more comprehensive content, reliable sources, and regular updates'
      });
    } else if (score < 80) {
      issues.push({
        severity: 'low' as const,
        description: 'Wikipedia presence exists but could be enhanced',
        recommendation: 'Enhance article with additional references, categories, and maintain regular updates'
      });
    }
    
    // Calculate score breakdown
    let scoreBreakdown = 'Base: 0';
    const relevantCount = relevantResults.length;
    if (relevantCount > 0) scoreBreakdown += ', Wikipedia Presence: +50';
    if (relevantPageInfo) {
      if (relevantPageInfo.extract) {
        const wordCount = relevantPageInfo.extract.split(' ').length;
        if (wordCount > 500) scoreBreakdown += ', Article Length (500+): +20';
        else if (wordCount > 200) scoreBreakdown += ', Article Length (200+): +10';
        else scoreBreakdown += ', Article Length: +5';
      }
      if (relevantPageInfo.categories) {
        if (relevantPageInfo.categories.length > 3) scoreBreakdown += ', Categories (3+): +15';
        else if (relevantPageInfo.categories.length > 0) scoreBreakdown += ', Categories: +8';
      }
      if (relevantPageInfo.externallinks) {
        if (relevantPageInfo.externallinks.length > 2) scoreBreakdown += ', External Links (2+): +10';
        else if (relevantPageInfo.externallinks.length > 0) scoreBreakdown += ', External Links: +5';
      }
      const lastUpdate = relevantPageInfo.touched ? new Date(relevantPageInfo.touched) : null;
      if (lastUpdate && (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30) < 12) scoreBreakdown += ', Recent Update: +5';
    }
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (${scoreBreakdown})`));
    
    return this.createResult(score, evidence, issues, details);
  }
}