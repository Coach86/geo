import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { 
  PageCategory, 
  PageCategoryType, 
  AnalysisLevel
} from '../interfaces/page-category.interface';
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

      // Default to unknown if LLM fails
      return {
        type: PageCategoryType.UNKNOWN,
        confidence: 0.5,
        analysisLevel: AnalysisLevel.PARTIAL,
        reason: 'LLM categorization failed'
      };
    } catch (error) {
      this.logger.error(`Error categorizing ${url}:`, error);
      // Default to unknown on error
      return {
        type: PageCategoryType.UNKNOWN,
        confidence: 0.5,
        analysisLevel: AnalysisLevel.PARTIAL,
        reason: 'Categorization error'
      };
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
        reason: 'Root URL'
      };
    }

    if (urlPath.includes('/404') || urlPath.includes('/error')) {
      return {
        type: PageCategoryType.SEARCH_RESULTS_ERROR_PAGES,
        confidence: 0.95,
        analysisLevel: AnalysisLevel.EXCLUDED,
        reason: 'Error page URL pattern'
      };
    }

    if (urlPath.includes('/login') || urlPath.includes('/signin') || urlPath.includes('/signup')) {
      return {
        type: PageCategoryType.PRIVATE_USER_ACCOUNT_PAGES,
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

TIER 1 - CORE BUSINESS & HIGH-IMPACT PAGES:
- homepage: The primary entry point and brand showcase of the entire website
- product_category_page: (PLP) Lists multiple products within a category
- product_detail_page: (PDP) Dedicated page for a single product
- services_features_page: Describes service offerings or product features
- pricing_page: Clearly outlines costs and plans
- comparison_page: Compares company's own products/services side-by-side
- blog_post_article: Single, focused article to attract and engage readers
- blog_category_tag_page: Archive page listing blog posts for a topic

TIER 2 - STRATEGIC CONTENT & RESOURCES:
- pillar_page_topic_hub: Comprehensive page covering a broad topic with links to cluster content
- product_roundup_review_article: Expert comparison of products/services from different companies
- how_to_guide_tutorial: Step-by-step instructional content
- case_study_success_story: Real-world customer example demonstrating value
- what_is_x_definitional_page: Defines a key term or concept
- in_depth_guide_white_paper: Comprehensive content on complex subjects
- faq_glossary_pages: Structured Q&A content and term definitions
- public_forum_ugc_pages: User-generated content forums

TIER 3 - SUPPORTING PAGES:
- corporate_contact_pages: About Us, Team Page, Contact Us, Careers, Press/Media Room, Store Locator
- private_user_account_pages: Login/Sign-up, User Profile/Dashboard, Order History, Wishlist
- search_results_error_pages: Search Results Page, 404 Error Page
- legal_pages: Privacy Policy, Terms of Service, Cookie Policy, Accessibility Statement

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
        analysisLevel: this.getAnalysisLevelForCategory(category),
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
   * Get analysis level for a specific category
   */
  private getAnalysisLevelForCategory(category: PageCategoryType): AnalysisLevel {
    // Map categories to analysis levels based on their importance
    const excludedCategories = [
      PageCategoryType.SEARCH_RESULTS_ERROR_PAGES,
      PageCategoryType.PRIVATE_USER_ACCOUNT_PAGES,
      PageCategoryType.LEGAL_PAGES
    ];

    const partialCategories = [
      PageCategoryType.PRICING_PAGE,
      PageCategoryType.CORPORATE_CONTACT_PAGES
    ];

    const limitedCategories = [
      PageCategoryType.PRODUCT_CATEGORY_PAGE,
      PageCategoryType.BLOG_CATEGORY_TAG_PAGE
    ];

    if (excludedCategories.includes(category)) {
      return AnalysisLevel.EXCLUDED;
    } else if (partialCategories.includes(category)) {
      return AnalysisLevel.PARTIAL;
    } else if (limitedCategories.includes(category)) {
      return AnalysisLevel.LIMITED;
    } else {
      return AnalysisLevel.FULL;
    }
  }

  /**
   * Get analysis rules for a specific category
   */
  getAnalysisRules(category: PageCategoryType): {
    shouldAnalyze: boolean;
    dimensions?: string[];
  } {
    const analysisLevel = this.getAnalysisLevelForCategory(category);

    switch (analysisLevel) {
      case AnalysisLevel.EXCLUDED:
        return { shouldAnalyze: false };
      
      case AnalysisLevel.LIMITED:
        return {
          shouldAnalyze: true,
          dimensions: ['structure', 'brandAlignment']
        };
      
      case AnalysisLevel.PARTIAL:
        return {
          shouldAnalyze: true,
          dimensions: ['freshness', 'structure', 'authority', 'brandAlignment']
        };
      
      case AnalysisLevel.FULL:
      default:
        return {
          shouldAnalyze: true,
          dimensions: ['freshness', 'structure', 'authority', 'brandAlignment']
        };
    }
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
      // Tier 1
      [PageCategoryType.HOMEPAGE]: 'Homepage',
      [PageCategoryType.PRODUCT_CATEGORY_PAGE]: 'Product Category (PLP)',
      [PageCategoryType.PRODUCT_DETAIL_PAGE]: 'Product Detail (PDP)',
      [PageCategoryType.SERVICES_FEATURES_PAGE]: 'Services/Features',
      [PageCategoryType.PRICING_PAGE]: 'Pricing Page',
      [PageCategoryType.COMPARISON_PAGE]: 'Comparison Page',
      [PageCategoryType.BLOG_POST_ARTICLE]: 'Blog Post/Article',
      [PageCategoryType.BLOG_CATEGORY_TAG_PAGE]: 'Blog Category/Tag Page',
      
      // Tier 2
      [PageCategoryType.PILLAR_PAGE_TOPIC_HUB]: 'Pillar Page/Topic Hub',
      [PageCategoryType.PRODUCT_ROUNDUP_REVIEW_ARTICLE]: 'Product Roundup/Review Article',
      [PageCategoryType.HOW_TO_GUIDE_TUTORIAL]: 'How-To Guide/Tutorial',
      [PageCategoryType.CASE_STUDY_SUCCESS_STORY]: 'Case Study/Success Story',
      [PageCategoryType.WHAT_IS_X_DEFINITIONAL_PAGE]: 'What is X/Definitional Page',
      [PageCategoryType.IN_DEPTH_GUIDE_WHITE_PAPER]: 'In-Depth Guide/White Paper',
      [PageCategoryType.FAQ_GLOSSARY_PAGES]: 'FAQ & Glossary Pages',
      [PageCategoryType.PUBLIC_FORUM_UGC_PAGES]: 'Public Forum & UGC Pages',
      
      // Tier 3
      [PageCategoryType.CORPORATE_CONTACT_PAGES]: 'Corporate & Contact Pages',
      [PageCategoryType.PRIVATE_USER_ACCOUNT_PAGES]: 'Private User Account Pages',
      [PageCategoryType.SEARCH_RESULTS_ERROR_PAGES]: 'Search Results & Error Pages',
      [PageCategoryType.LEGAL_PAGES]: 'Legal Pages',
      
      [PageCategoryType.UNKNOWN]: 'Unknown'
    };
    
    return names[category] || 'Unknown';
  }
}