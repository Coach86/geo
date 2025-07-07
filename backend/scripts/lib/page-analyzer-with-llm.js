const cheerio = require('cheerio');
const { analyzeWithRules } = require('./rules/rule-engine-with-filtering');
const { PageCategorizerService } = require('./page-categorizer');

// LLM imports
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

// Initialize LLM clients from environment variables
function initializeLLMClients() {
  const clients = {};
  
  // Initialize OpenAI if API key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      clients.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log('✓ OpenAI client initialized');
    } catch (error) {
      console.warn('⚠ Failed to initialize OpenAI client:', error.message);
    }
  }
  
  // Initialize Anthropic if API key is available
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      clients.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      console.log('✓ Anthropic client initialized');
    } catch (error) {
      console.warn('⚠ Failed to initialize Anthropic client:', error.message);
    }
  }
  
  // Initialize Google AI if API key is available
  if (process.env.GOOGLE_API_KEY) {
    try {
      clients.google = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: 'gemini-1.5-flash',
        temperature: 0.2,
        maxOutputTokens: 2000
      });
      console.log('✓ Google AI client initialized');
    } catch (error) {
      console.warn('⚠ Failed to initialize Google AI client:', error.message);
    }
  }
  
  if (Object.keys(clients).length === 0) {
    console.warn('⚠ No LLM clients initialized. Some rules may not work properly.');
    console.warn('  Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY in your .env file');
  }
  
  return clients;
}

// Global LLM clients instance
let llmClients = null;

/**
 * Analyze a page with all rules and return scores
 * @param {Object} pageData - The crawled page data
 * @param {Object} options - Analysis options
 * @returns {Object} Analysis results with scores and issues
 */
async function analyzePageWithRules(pageData, options = {}) {
  // Initialize LLM clients on first use
  if (!llmClients) {
    llmClients = initializeLLMClients();
  }
  
  if (!pageData || !pageData.html) {
    return {
      scores: {
        technical: null,
        content: null,
        authority: null,
        quality: null
      },
      globalScore: 0,
      issues: [{
        dimension: 'technical',
        severity: 'critical',
        description: 'Page could not be crawled or has no content',
        recommendation: 'Ensure the page is accessible and returns valid HTML'
      }],
      recommendations: []
    };
  }
  
  try {
    // Initialize page categorizer with LLM clients
    const categorizer = new PageCategorizerService(llmClients);
    
    // Categorize the page
    console.log(`  Categorizing page: ${pageData.url}`);
    const pageCategory = await categorizer.categorize(
      pageData.url,
      pageData.html,
      {
        title: pageData.title,
        metaDescription: pageData.meta_description
      }
    );
    
    console.log(`  Page categorized as: ${pageCategory.type} (confidence: ${pageCategory.confidence})`);
    
    // Skip analysis for excluded pages
    if (pageCategory.analysisLevel === 'excluded') {
      console.log(`  Skipping analysis for excluded page type: ${pageCategory.type}`);
      return {
        scores: {
          technical: 0,
          content: 0,
          authority: 0,
          quality: 0
        },
        globalScore: 0,
        pageCategory: pageCategory.type,
        analysisLevel: pageCategory.analysisLevel,
        skipReason: `Page type ${pageCategory.type} is excluded from analysis`,
        issues: [],
        recommendations: []
      };
    }
    
    // Prepare page content object for rules
    const pageContent = {
      url: pageData.url,
      html: pageData.html,
      $ : cheerio.load(pageData.html),
      pageCategory: pageCategory,
      metadata: {
        ...pageData.metadata,
        statusCode: pageData.status_code,
        contentType: pageData.content_type,
        title: pageData.title,
        metaDescription: pageData.meta_description
      }
    };
    
    // Run all rules and get dimension scores
    // Pass LLM clients to rules that need them
    const analysisResult = await analyzeWithRules(pageContent, {
      llmClients,
      pageCategory: pageCategory.type,
      analysisLevel: pageCategory.analysisLevel
    });
    
    // Calculate global score (average of dimensions) - exclude null scores
    const dimensionScores = [
      analysisResult.scores.technical,
      analysisResult.scores.content,
      analysisResult.scores.authority,
      analysisResult.scores.quality
    ].filter(score => score !== null);
    
    const globalScore = dimensionScores.length > 0 
      ? Math.round(dimensionScores.reduce((sum, score) => sum + score, 0) / dimensionScores.length)
      : 0;
    
    return {
      scores: analysisResult.scores,
      globalScore,
      pageCategory: pageCategory.type,
      analysisLevel: pageCategory.analysisLevel,
      categoryConfidence: pageCategory.confidence,
      issues: analysisResult.issues,
      recommendations: analysisResult.recommendations,
      ruleResults: analysisResult.ruleResults,
      llmUsageCount: analysisResult.llmUsageCount || 0
    };
    
  } catch (error) {
    console.error(`Error analyzing page ${pageData.url}:`, error);
    
    return {
      scores: {
        technical: null,
        content: null,
        authority: null,
        quality: null
      },
      globalScore: 0,
      issues: [{
        dimension: 'technical',
        severity: 'critical',
        description: `Analysis error: ${error.message}`,
        recommendation: 'Fix the analysis error and try again'
      }],
      recommendations: []
    };
  }
}

/**
 * Get LLM usage statistics
 */
function getLLMUsageStats() {
  return {
    initialized: llmClients !== null,
    providers: llmClients ? Object.keys(llmClients) : []
  };
}

module.exports = {
  analyzePageWithRules,
  initializeLLMClients,
  getLLMUsageStats
};