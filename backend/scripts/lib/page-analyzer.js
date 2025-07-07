const cheerio = require('cheerio');
const { analyzeWithRules } = require('./rules/rule-engine');

/**
 * Analyze a page with all rules and return scores
 * @param {Object} pageData - The crawled page data
 * @returns {Object} Analysis results with scores and issues
 */
async function analyzePageWithRules(pageData) {
  if (!pageData || !pageData.html) {
    return {
      scores: {
        technical: 0,
        content: 0,
        authority: 0,
        quality: 0
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
    // Prepare page content object for rules
    const pageContent = {
      url: pageData.url,
      html: pageData.html,
      $ : cheerio.load(pageData.html),
      metadata: {
        ...pageData.metadata,
        statusCode: pageData.status_code,
        contentType: pageData.content_type,
        title: pageData.title,
        metaDescription: pageData.meta_description
      }
    };
    
    // Run all rules and get dimension scores
    const analysisResult = await analyzeWithRules(pageContent);
    
    // Calculate global score (average of dimensions)
    const dimensionScores = [
      analysisResult.scores.technical,
      analysisResult.scores.content,
      analysisResult.scores.authority,
      analysisResult.scores.quality
    ];
    
    const globalScore = Math.round(
      dimensionScores.reduce((sum, score) => sum + score, 0) / dimensionScores.length
    );
    
    return {
      scores: analysisResult.scores,
      globalScore,
      issues: analysisResult.issues,
      recommendations: analysisResult.recommendations,
      ruleResults: analysisResult.ruleResults
    };
    
  } catch (error) {
    console.error(`Error analyzing page ${pageData.url}:`, error);
    
    return {
      scores: {
        technical: 0,
        content: 0,
        authority: 0,
        quality: 0
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

module.exports = {
  analyzePageWithRules
};