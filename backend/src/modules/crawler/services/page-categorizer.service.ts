import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { 
  PageCategory, 
  PageCategoryType, 
  AnalysisLevel,
  CategoryDetectionRule,
  DimensionWeights
} from '../interfaces/page-category.interface';
import { CATEGORY_DETECTION_RULES, getCategoryWeightModifiers, getAnalysisLevel } from '../config/category-rules';
import { PageMetadata } from '../schemas/crawled-page.schema';
import { LlmService } from '../../llm/services/llm.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';

@Injectable()
export class PageCategorizerService {
  private readonly logger = new Logger(PageCategorizerService.name);

  constructor(private readonly llmService: LlmService) {}

  /**
   * Categorize a webpage based on URL, content, and metadata using LLM
   */
  async categorize(url: string, html: string, metadata?: PageMetadata): Promise<PageCategory> {
    try {
      // First try quick URL-based categorization for obvious cases
      const quickCategory = this.quickCategorizeByUrl(url);
      if (quickCategory && quickCategory.confidence > 0.9) {
        return quickCategory;
      }

      // Use LLM for more accurate categorization
      const llmCategory = await this.categorizewithLLM(url, html, metadata);
      if (llmCategory) {
        return llmCategory;
      }

      // Fallback to rule-based categorization
      return this.categorizeWithRules(url, html, metadata);
    } catch (error) {
      this.logger.error(`Error categorizing ${url}:`, error);
      // Fallback to rule-based on error
      return this.categorizeWithRules(url, html, metadata);
    }
  }

  /**
   * Quick categorization based on URL patterns only
   */
  private quickCategorizeByUrl(url: string): PageCategory | null {
    const urlPath = new URL(url).pathname.toLowerCase();
    
    // Very obvious patterns
    if (urlPath === '/' || urlPath === '') {
      return {
        type: PageCategoryType.HOMEPAGE,
        confidence: 1.0,
        analysisLevel: AnalysisLevel.FULL,
        weightModifiers: getCategoryWeightModifiers(PageCategoryType.HOMEPAGE),
        reason: 'Root URL'
      };
    }

    if (urlPath.includes('/404') || urlPath.includes('/error')) {
      return {
        type: PageCategoryType.ERROR_404,
        confidence: 0.95,
        analysisLevel: AnalysisLevel.EXCLUDED,
        reason: 'Error page URL pattern'
      };
    }

    if (urlPath.includes('/login') || urlPath.includes('/signin') || urlPath.includes('/signup')) {
      return {
        type: PageCategoryType.LOGIN_ACCOUNT,
        confidence: 0.95,
        analysisLevel: AnalysisLevel.EXCLUDED,
        reason: 'Authentication page URL pattern'
      };
    }

    return null;
  }

  /**
   * Use LLM to categorize the page
   */
  private async categorizewithLLM(url: string, html: string, metadata?: PageMetadata): Promise<PageCategory | null> {
    const $ = cheerio.load(html);
    const cleanContent = this.extractCleanContent($);
    
    const prompt = this.buildCategorizationPrompt(url, cleanContent, metadata);
    
    try {
      const response = await this.llmService.call(
        LlmProvider.OpenAILangChain,
        prompt,
        {
          model: 'gpt-4o-mini', // Fast and cost-effective for categorization
          temperature: 0.1, // Low temperature for consistent categorization
          maxTokens: 200,
        }
      );

      const category = this.parseLLMResponse(response.text);
      if (category) {
        this.logger.log(`LLM categorized ${url} as ${category.type} with confidence ${category.confidence}`);
        return category;
      }
    } catch (error) {
      this.logger.error('LLM categorization failed:', error);
    }

    return null;
  }

  /**
   * Build prompt for LLM categorization
   */
  private buildCategorizationPrompt(url: string, content: string, metadata?: PageMetadata): string {
    const truncatedContent = content.substring(0, 2000); // Limit content length
    
    return `Categorize this webpage into one of the following categories:

CATEGORIES:
- homepage: Main landing page, company overview
- product_service: Product or service details
- blog_article: Blog posts, articles, news
- documentation_help: Technical docs, help, guides, tutorials
- about_company: About us, team, mission pages
- contact: Contact forms, contact info
- legal_policy: Terms, privacy, legal pages
- navigation_category: Category listings, navigation pages
- landing_campaign: Marketing landing pages, campaigns
- faq: FAQ pages, Q&A sections
- case_study: Customer stories, case studies
- pricing: Pricing information, plans
- error_404: Error pages, not found
- login_account: Login, account, dashboard pages
- search_results: Search result pages
- unknown: Cannot determine category

URL: ${url}
TITLE: ${metadata?.title || 'No title'}
META DESCRIPTION: ${metadata?.description || 'No description'}

CONTENT (first 2000 chars):
${truncatedContent}

Return ONLY a JSON object with:
{
  "category": "category_name",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}`;
  }

  /**
   * Parse LLM response
   */
  private parseLLMResponse(response: string): PageCategory | null {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.category || !Object.values(PageCategoryType).includes(parsed.category)) {
        throw new Error(`Invalid category: ${parsed.category}`);
      }

      const category = parsed.category as PageCategoryType;
      const confidence = Math.min(Math.max(parsed.confidence || 0.5, 0), 1);

      return {
        type: category,
        confidence,
        analysisLevel: getAnalysisLevel(category),
        weightModifiers: getCategoryWeightModifiers(category),
        reason: parsed.reason || 'LLM categorization'
      };
    } catch (error) {
      this.logger.error('Failed to parse LLM response:', error);
      return null;
    }
  }

  /**
   * Extract clean content for LLM analysis
   */
  private extractCleanContent($: cheerio.CheerioAPI): string {
    // Remove scripts, styles, and other non-content elements
    $('script, style, noscript, iframe').remove();
    
    // Get key content indicators
    const parts: string[] = [];
    
    // Title
    const title = $('title').text().trim();
    if (title) parts.push(`Title: ${title}`);
    
    // Main headings
    const h1 = $('h1').first().text().trim();
    if (h1) parts.push(`H1: ${h1}`);
    
    // Navigation items (helps identify page type)
    const navItems = $('nav a, .nav a, .navigation a')
      .slice(0, 10)
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(text => text.length > 0);
    if (navItems.length > 0) {
      parts.push(`Navigation: ${navItems.join(', ')}`);
    }
    
    // Main content
    const mainContent = $('main, article, [role="main"], .content, #content')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000);
    if (mainContent) {
      parts.push(`Content: ${mainContent}`);
    } else {
      // Fallback to body text
      const bodyText = $('body')
        .text()
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 1000);
      parts.push(`Content: ${bodyText}`);
    }
    
    return parts.join('\n\n');
  }

  /**
   * Original rule-based categorization as fallback
   */
  private categorizeWithRules(url: string, html: string, metadata?: PageMetadata): PageCategory {
    const $ = cheerio.load(html);
    let bestMatch: PageCategory | null = null;
    let bestScore = 0;

    // Evaluate each rule
    for (const rule of CATEGORY_DETECTION_RULES) {
      const score = this.evaluateRule(rule, url, $, metadata);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          type: rule.category,
          confidence: Math.min(score * 1.2, 0.9), // Cap at 0.9 for rule-based
          analysisLevel: rule.analysisLevel,
          weightModifiers: rule.weightModifiers,
          reason: this.getCategorizationReason(rule, url)
        };
      }
    }

    // Return best match or unknown
    return bestMatch || {
      type: PageCategoryType.UNKNOWN,
      confidence: 0.5,
      analysisLevel: AnalysisLevel.PARTIAL,
      reason: 'No matching category patterns found'
    };
  }

  /**
   * Get analysis rules for a specific category
   */
  getAnalysisRules(category: PageCategoryType): {
    shouldAnalyze: boolean;
    dimensions?: string[];
    weightModifiers?: DimensionWeights;
  } {
    const rule = CATEGORY_DETECTION_RULES.find(r => r.category === category);
    if (!rule) {
      return { shouldAnalyze: true };
    }

    switch (rule.analysisLevel) {
      case AnalysisLevel.EXCLUDED:
        return { shouldAnalyze: false };
      
      case AnalysisLevel.LIMITED:
        return {
          shouldAnalyze: true,
          dimensions: ['structure', 'brandAlignment'],
          weightModifiers: rule.weightModifiers
        };
      
      case AnalysisLevel.PARTIAL:
        return {
          shouldAnalyze: true,
          dimensions: ['freshness', 'structure', 'snippetExtractability', 'authority', 'brandAlignment'],
          weightModifiers: rule.weightModifiers
        };
      
      case AnalysisLevel.FULL:
      default:
        return {
          shouldAnalyze: true,
          dimensions: ['freshness', 'structure', 'snippetExtractability', 'authority', 'brandAlignment'],
          weightModifiers: rule.weightModifiers
        };
    }
  }

  /**
   * Evaluate how well a page matches a category rule
   */
  private evaluateRule(
    rule: CategoryDetectionRule, 
    url: string, 
    $: cheerio.CheerioAPI,
    metadata?: PageMetadata
  ): number {
    let score = 0;
    let matches = 0;
    let totalChecks = 0;

    // Check URL patterns
    if (rule.patterns.urlPatterns) {
      totalChecks++;
      const urlPath = new URL(url).pathname.toLowerCase();
      if (rule.patterns.urlPatterns.some(pattern => pattern.test(urlPath))) {
        matches++;
        score += 0.4; // URL patterns are strong indicators
      }
    }

    // Check schema types
    if (rule.patterns.schemaTypes && rule.patterns.schemaTypes.length > 0) {
      totalChecks++;
      const schemaTypes = this.extractSchemaTypes($);
      if (rule.patterns.schemaTypes.some(type => schemaTypes.includes(type))) {
        matches++;
        score += 0.3;
      }
    }

    // Check meta patterns
    if (rule.patterns.metaPatterns) {
      totalChecks++;
      const metaContent = this.extractMetaContent($);
      if (rule.patterns.metaPatterns.some(pattern => pattern.test(metaContent))) {
        matches++;
        score += 0.15;
      }
    }

    // Check content patterns
    if (rule.patterns.contentPatterns) {
      totalChecks++;
      const bodyText = $('body').text().toLowerCase();
      if (rule.patterns.contentPatterns.some(pattern => pattern.test(bodyText))) {
        matches++;
        score += 0.1;
      }
    }

    // Check DOM selectors
    if (rule.patterns.domSelectors) {
      totalChecks++;
      if (rule.patterns.domSelectors.some(selector => $(selector).length > 0)) {
        matches++;
        score += 0.05;
      }
    }

    // Normalize score based on how many checks matched
    if (totalChecks > 0) {
      const matchRatio = matches / totalChecks;
      score = score * (0.5 + matchRatio * 0.5); // Weight by match ratio
    }

    return score;
  }

  /**
   * Extract schema.org types from the page
   */
  private extractSchemaTypes($: cheerio.CheerioAPI): string[] {
    const types: string[] = [];

    // Check JSON-LD
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const json = JSON.parse($(element).html() || '{}');
        if (json['@type']) {
          if (Array.isArray(json['@type'])) {
            types.push(...json['@type']);
          } else {
            types.push(json['@type']);
          }
        }
      } catch (error) {
        // Ignore parse errors
      }
    });

    // Check microdata
    $('[itemtype]').each((_, element) => {
      const itemtype = $(element).attr('itemtype');
      if (itemtype) {
        const type = itemtype.split('/').pop();
        if (type) types.push(type);
      }
    });

    return types;
  }

  /**
   * Extract meta content for pattern matching
   */
  private extractMetaContent($: cheerio.CheerioAPI): string {
    const parts: string[] = [];
    
    // Title
    parts.push($('title').text());
    
    // Meta description
    parts.push($('meta[name="description"]').attr('content') || '');
    
    // OG tags
    parts.push($('meta[property^="og:"]').map((_, el) => $(el).attr('content')).get().join(' '));
    
    return parts.join(' ').toLowerCase();
  }

  /**
   * Generate a human-readable reason for the categorization
   */
  private getCategorizationReason(rule: CategoryDetectionRule, url: string): string {
    const reasons: string[] = [];
    
    if (rule.patterns.urlPatterns) {
      const urlPath = new URL(url).pathname;
      if (rule.patterns.urlPatterns.some(pattern => pattern.test(urlPath))) {
        reasons.push(`URL pattern match: ${urlPath}`);
      }
    }

    if (reasons.length === 0) {
      reasons.push('Content and structure analysis');
    }

    return reasons.join('; ');
  }

  /**
   * Check if a page should be analyzed based on its category
   */
  shouldAnalyzePage(category: PageCategoryType): boolean {
    const rules = this.getAnalysisRules(category);
    return rules.shouldAnalyze;
  }

  /**
   * Get human-readable category name
   */
  getCategoryDisplayName(category: PageCategoryType): string {
    const names: Record<PageCategoryType, string> = {
      [PageCategoryType.HOMEPAGE]: 'Homepage',
      [PageCategoryType.PRODUCT_SERVICE]: 'Product/Service',
      [PageCategoryType.BLOG_ARTICLE]: 'Blog/Article',
      [PageCategoryType.DOCUMENTATION_HELP]: 'Documentation/Help',
      [PageCategoryType.ABOUT_COMPANY]: 'About/Company',
      [PageCategoryType.CONTACT]: 'Contact',
      [PageCategoryType.LEGAL_POLICY]: 'Legal/Policy',
      [PageCategoryType.NAVIGATION_CATEGORY]: 'Navigation/Category',
      [PageCategoryType.LANDING_CAMPAIGN]: 'Landing/Campaign',
      [PageCategoryType.FAQ]: 'FAQ',
      [PageCategoryType.CASE_STUDY]: 'Case Study',
      [PageCategoryType.PRICING]: 'Pricing',
      [PageCategoryType.ERROR_404]: '404/Error',
      [PageCategoryType.LOGIN_ACCOUNT]: 'Login/Account',
      [PageCategoryType.SEARCH_RESULTS]: 'Search Results',
      [PageCategoryType.UNKNOWN]: 'Unknown'
    };
    
    return names[category] || 'Unknown';
  }
}