const { RuleAggregator } = require('./aggregator');

// Import all rules
const technicalRules = require('./technical');
const contentRules = require('./content');
const authorityRules = require('./authority');
const qualityRules = require('./quality');

// Import LLM-enabled rules
const InDepthGuidesLLMRule = require('./quality/in-depth-guides-llm.rule');

/**
 * Analyze page content with all rules
 * @param {Object} pageContent - The page content object
 * @param {Object} options - Analysis options including LLM clients
 * @returns {Object} Analysis results
 */
async function analyzeWithRules(pageContent, options = {}) {
  const aggregator = new RuleAggregator();
  const llmClients = options.llmClients || {};
  const pageCategory = options.pageCategory;
  const analysisLevel = options.analysisLevel;
  
  // Track LLM usage
  let llmUsageCount = 0;
  
  // Group rules by dimension
  const ruleGroups = {
    technical: technicalRules,
    content: contentRules,
    authority: authorityRules,
    quality: qualityRules
  };
  
  // Replace specific rules with LLM-enabled versions if LLM is available
  if (llmClients && Object.keys(llmClients).length > 0) {
    // Find and replace the in-depth guides rule in quality rules
    const inDepthIndex = ruleGroups.quality.findIndex(Rule => {
      const rule = new Rule();
      return rule.id === 'in-depth-guides';
    });
    
    if (inDepthIndex >= 0) {
      // Replace with LLM version
      ruleGroups.quality[inDepthIndex] = InDepthGuidesLLMRule;
      console.log('  Using LLM-enabled version of in-depth guides rule');
    }
  }
  
  const dimensionResults = {};
  const allIssues = [];
  const allRecommendations = [];
  const allRuleResults = {};
  
  // Process each dimension in parallel
  const dimensionPromises = Object.entries(ruleGroups).map(async ([dimension, rules]) => {
    const ruleResults = [];
    const ruleDetails = [];
    
    // Run rules in parallel within each dimension
    const rulePromises = rules.map(async (Rule) => {
      try {
        // Initialize rule with LLM clients if it's an LLM-enabled rule
        const rule = Rule.prototype && Rule.prototype.constructor.name.includes('LLM') 
          ? new Rule(llmClients)
          : new Rule();
          
        const result = await rule.evaluate(pageContent, options);
        
        // Track LLM usage
        if (result.llmUsed) {
          llmUsageCount++;
        }
        
        return {
          result,
          rule: {
            id: rule.id,
            name: rule.name
          }
        };
      } catch (error) {
        console.error(`Error running rule ${Rule.name}:`, error);
        return null;
      }
    });
    
    // Wait for all rules in dimension to complete
    const ruleOutcomes = await Promise.all(rulePromises);
    
    // Process results
    for (const outcome of ruleOutcomes) {
      if (outcome) {
        const { result, rule } = outcome;
        ruleResults.push(result);
        ruleDetails.push(rule);
        
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
      }
    }
    
    // Aggregate dimension scores
    const aggregatedScore = aggregator.aggregate(ruleResults, dimension, ruleDetails);
    dimensionResults[dimension] = aggregatedScore;
    allRuleResults[dimension] = ruleResults;
  });
  
  // Wait for all dimensions to complete
  await Promise.all(dimensionPromises);
  
  // Extract dimension scores
  const scores = {
    technical: dimensionResults.technical?.finalScore || 0,
    content: dimensionResults.content?.finalScore || 0,
    authority: dimensionResults.authority?.finalScore || 0,
    quality: dimensionResults.quality?.finalScore || 0
  };
  
  // Log analysis summary
  console.log(`  Rules executed: ${Object.values(allRuleResults).flat().length} (${llmUsageCount} with LLM)`);
  
  return {
    scores,
    issues: allIssues,
    recommendations: allRecommendations,
    dimensionResults,
    ruleResults: allRuleResults,
    llmUsageCount
  };
}

module.exports = {
  analyzeWithRules
};