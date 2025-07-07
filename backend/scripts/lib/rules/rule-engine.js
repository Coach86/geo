const { RuleAggregator } = require('./aggregator');

// Import all rules
const technicalRules = require('./technical');
const contentRules = require('./content');
const authorityRules = require('./authority');
const qualityRules = require('./quality');

/**
 * Analyze page content with all rules
 * @param {Object} pageContent - The page content object
 * @returns {Object} Analysis results
 */
async function analyzeWithRules(pageContent) {
  const aggregator = new RuleAggregator();
  
  // Group rules by dimension
  const ruleGroups = {
    technical: technicalRules,
    content: contentRules,
    authority: authorityRules,
    quality: qualityRules
  };
  
  const dimensionResults = {};
  const allIssues = [];
  const allRecommendations = [];
  const allRuleResults = {};
  
  // Process each dimension
  for (const [dimension, rules] of Object.entries(ruleGroups)) {
    const ruleResults = [];
    const ruleDetails = [];
    console.log(`  Running ${dimension} rules: ${rules.length} rules`);
    
    // Run each rule in the dimension
    for (const Rule of rules) {
      try {
        const rule = new Rule();
        console.log(`  Running ${dimension} rule: ${rule.name}`);
        const result = await rule.evaluate(pageContent.url, pageContent);
        
        ruleResults.push(result);
        ruleDetails.push({
          id: rule.id,
          name: rule.name
        });
        
        // Collect issues
        if (result.issues) {
          allIssues.push(...result.issues.map(issue => ({
            ...issue,
            dimension,
            ruleId: rule.id
          })));
        }
        
        // Collect recommendations
        if (result.recommendations) {
          allRecommendations.push(...result.recommendations.map(rec => ({
            content: rec,
            ruleId: rule.id,
            ruleCategory: dimension
          })));
        }
        
      } catch (error) {
        console.error(`Error running rule ${Rule.name}:`, error);
        // Continue with other rules
      }
    }
    
    // Aggregate dimension scores
    const aggregatedScore = aggregator.aggregate(ruleResults, dimension, ruleDetails);
    dimensionResults[dimension] = aggregatedScore;
    allRuleResults[dimension] = ruleResults;
  }
  
  // Extract dimension scores
  const scores = {
    technical: dimensionResults.technical?.finalScore || 0,
    content: dimensionResults.content?.finalScore || 0,
    authority: dimensionResults.authority?.finalScore || 0,
    quality: dimensionResults.quality?.finalScore || 0
  };
  
  return {
    scores,
    issues: allIssues,
    recommendations: allRecommendations,
    dimensionResults,
    ruleResults: allRuleResults
  };
}

module.exports = {
  analyzeWithRules
};