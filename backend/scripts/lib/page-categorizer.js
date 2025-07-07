const cheerio = require('cheerio');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
// Google AI is available through langchain
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

// Import page category types from the single source of truth
const { PageCategoryType, AnalysisLevel } = require('./page-category-types');

class PageCategorizerService {
  constructor(llmClients = {}) {
    this.llmClients = llmClients;
    // Default to OpenAI for categorization
    this.primaryProvider = 'openai';
    this.fallbackProvider = 'google';
  }

  /**
   * Categorize a webpage based on URL, content, and metadata using LLM
   */
  async categorize(url, html, metadata = {}) {
    try {
      // First try quick URL-based categorization for obvious cases
      const quickCategory = this.quickCategorizeByUrl(url);
      if (quickCategory && quickCategory.confidence > 0.9) {
        return quickCategory;
      }

      // Use LLM for more accurate categorization
      const llmCategory = await this.categorizeWithLLM(url, html, metadata);
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
      console.error(`Error categorizing ${url}:`, error);
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
   * MATCHES REAL SYSTEM - only categorizes very obvious patterns
   */
  quickCategorizeByUrl(url) {
    const urlObj = new URL(url);
    const urlPath = urlObj.pathname.toLowerCase();
    
    // Very obvious patterns only
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

    // Return null for everything else - let LLM decide
    return null;
  }

  /**
   * Use LLM to categorize the page
   */
  async categorizeWithLLM(url, html, metadata) {
    const $ = cheerio.load(html);
    const cleanContent = this.extractCleanContent($);
    
    const prompt = this.buildCategorizationPrompt(url, cleanContent, metadata);
    
    try {
      // Try primary provider first
      let result = await this.callLLMProvider(this.primaryProvider, prompt);
      if (!result && this.fallbackProvider) {
        console.log(`Primary LLM failed, trying fallback: ${this.fallbackProvider}`);
        result = await this.callLLMProvider(this.fallbackProvider, prompt);
      }
      
      if (result) {
        return this.parseCategorizationResult(result);
      }
    } catch (error) {
      console.error('LLM categorization error:', error);
    }
    
    return null;
  }

  async callLLMProvider(provider, prompt) {
    try {
      switch (provider) {
        case 'openai':
          if (!this.llmClients.openai) return null;
          const openaiResponse = await this.llmClients.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a web page categorization expert.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          });
          return openaiResponse.choices[0].message.content;

        case 'anthropic':
          if (!this.llmClients.anthropic) return null;
          const anthropicResponse = await this.llmClients.anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.1,
            system: 'You are a web page categorization expert. Always respond with valid JSON.'
          });
          return anthropicResponse.content[0].text;

        case 'google':
          if (!this.llmClients.google) return null;
          const googleResponse = await this.llmClients.google.invoke([
            { type: 'human', content: prompt }
          ]);
          return googleResponse.content;

        default:
          return null;
      }
    } catch (error) {
      console.error(`Error calling ${provider}:`, error.message);
      return null;
    }
  }

  buildCategorizationPrompt(url, cleanContent, metadata) {
    const contentPreview = cleanContent.substring(0, 2000);
    const title = metadata.title || '';
    const description = metadata.metaDescription || '';
    
    // Use the EXACT prompt from the real system
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
TITLE: ${title}
META DESCRIPTION: ${description}

CONTENT (first 2000 chars):
${contentPreview}

Return ONLY a JSON object with:
{
  "category": "category_name",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}`;
  }

  extractCleanContent($) {
    // Remove script and style tags
    $('script, style, nav, header, footer').remove();
    
    // Extract text content
    const text = $('body').text();
    
    // Clean up whitespace
    return text.replace(/\s+/g, ' ').trim();
  }

  parseCategorizationResult(result) {
    try {
      const parsed = JSON.parse(result);
      
      // Validate and normalize the result
      const category = parsed.category || PageCategoryType.UNKNOWN;
      const confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));
      const analysisLevel = this.getAnalysisLevelForCategory(category);
      const reason = parsed.reason || 'LLM categorization';
      
      return {
        type: category,
        confidence,
        analysisLevel,
        reason
      };
    } catch (error) {
      console.error('Error parsing categorization result:', error);
      return null;
    }
  }

  /**
   * Get analysis level for a specific category
   */
  getAnalysisLevelForCategory(category) {
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
}

module.exports = {
  PageCategorizerService,
  PageCategoryType,
  AnalysisLevel
};