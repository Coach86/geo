const cheerio = require('cheerio');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
// Google AI is available through langchain
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

// Page category types (from the real system)
const PageCategoryType = {
  HOMEPAGE: 'HOMEPAGE',
  PRODUCT_PAGES: 'PRODUCT_PAGES',
  SERVICE_PAGES: 'SERVICE_PAGES',
  PILLAR_PAGES: 'PILLAR_PAGES',
  BLOG_POSTS: 'BLOG_POSTS',
  CASE_STUDIES: 'CASE_STUDIES',
  GUIDES_TUTORIALS: 'GUIDES_TUTORIALS',
  FAQ_PAGES: 'FAQ_PAGES',
  TOOLS_CALCULATORS: 'TOOLS_CALCULATORS',
  ABOUT_US: 'ABOUT_US',
  PRIVATE_USER_ACCOUNT_PAGES: 'PRIVATE_USER_ACCOUNT_PAGES',
  SEARCH_RESULTS_ERROR_PAGES: 'SEARCH_RESULTS_ERROR_PAGES',
  UNKNOWN: 'UNKNOWN'
};

const AnalysisLevel = {
  FULL: 'full',
  PARTIAL: 'partial',
  EXCLUDED: 'excluded'
};

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
   */
  quickCategorizeByUrl(url) {
    const urlObj = new URL(url);
    const urlPath = urlObj.pathname.toLowerCase();
    
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

    // Product/service indicators
    if (urlPath.includes('/product') || urlPath.includes('/products')) {
      return {
        type: PageCategoryType.PRODUCT_PAGES,
        confidence: 0.85,
        analysisLevel: AnalysisLevel.FULL,
        reason: 'Product URL pattern'
      };
    }

    if (urlPath.includes('/service') || urlPath.includes('/services')) {
      return {
        type: PageCategoryType.SERVICE_PAGES,
        confidence: 0.85,
        analysisLevel: AnalysisLevel.FULL,
        reason: 'Service URL pattern'
      };
    }

    if (urlPath.includes('/blog/') || urlPath.includes('/news/')) {
      return {
        type: PageCategoryType.BLOG_POSTS,
        confidence: 0.85,
        analysisLevel: AnalysisLevel.FULL,
        reason: 'Blog URL pattern'
      };
    }

    if (urlPath.includes('/guide') || urlPath.includes('/tutorial') || urlPath.includes('/how-to')) {
      return {
        type: PageCategoryType.GUIDES_TUTORIALS,
        confidence: 0.85,
        analysisLevel: AnalysisLevel.FULL,
        reason: 'Guide URL pattern'
      };
    }

    if (urlPath.includes('/about')) {
      return {
        type: PageCategoryType.ABOUT_US,
        confidence: 0.85,
        analysisLevel: AnalysisLevel.FULL,
        reason: 'About URL pattern'
      };
    }

    if (urlPath.includes('/faq') || urlPath.includes('/questions')) {
      return {
        type: PageCategoryType.FAQ_PAGES,
        confidence: 0.85,
        analysisLevel: AnalysisLevel.FULL,
        reason: 'FAQ URL pattern'
      };
    }

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
            temperature: 0.2,
            response_format: { type: "json_object" }
          });
          return openaiResponse.choices[0].message.content;

        case 'anthropic':
          if (!this.llmClients.anthropic) return null;
          const anthropicResponse = await this.llmClients.anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.2,
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
    
    return `Analyze this webpage and categorize it into one of these types:

Page Categories:
- HOMEPAGE: Main landing page of a website
- PRODUCT_PAGES: Individual product listings or details
- SERVICE_PAGES: Service descriptions and offerings
- PILLAR_PAGES: Comprehensive topic overview pages
- BLOG_POSTS: Blog articles and news posts
- CASE_STUDIES: Customer success stories and case studies
- GUIDES_TUTORIALS: How-to guides and tutorials
- FAQ_PAGES: Frequently asked questions
- TOOLS_CALCULATORS: Interactive tools or calculators
- ABOUT_US: About/team/company pages
- PRIVATE_USER_ACCOUNT_PAGES: Login/account pages (should be excluded)
- SEARCH_RESULTS_ERROR_PAGES: Search/404/error pages (should be excluded)
- UNKNOWN: Cannot determine category

URL: ${url}
Title: ${title}
Meta Description: ${description}
Content Preview: ${contentPreview}

Respond with JSON containing:
{
  "category": "One of the categories above",
  "confidence": 0.0-1.0,
  "analysisLevel": "full|partial|excluded",
  "reason": "Brief explanation"
}

Focus on:
1. URL patterns and structure
2. Page title and headings
3. Content type and purpose
4. Navigation and structural elements`;
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
      const analysisLevel = parsed.analysisLevel || AnalysisLevel.PARTIAL;
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
}

module.exports = {
  PageCategorizerService,
  PageCategoryType,
  AnalysisLevel
};