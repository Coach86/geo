const { RuleAggregator } = require('./aggregator');

// Import all rules
const technicalRules = require('./technical');
const contentRules = require('./content');
const authorityRules = require('./authority');
const qualityRules = require('./quality');

// Import LLM-enabled rules
const InDepthGuidesLLMRule = require('./quality/in-depth-guides-llm.rule');
const DefinitionalContentLLMRule = require('./content/definitional-content-llm.rule');
const CaseStudiesLLMRule = require('./content/case-studies-llm.rule');
const ComparisonContentLLMRule = require('./authority/comparison-content-llm.rule');

/**
 * Filter rules by page type - matches real system behavior
 */
function filterRulesByPageType(rules, pageCategory) {
  if (!pageCategory) return rules;
  
  return rules.filter(Rule => {
    // Create instance to check configuration
    const tempRule = new Rule();
    
    // If no pageTypes specified, rule applies to all pages
    if (!tempRule.pageTypes || tempRule.pageTypes.length === 0) {
      return true;
    }
    
    // Check if current page type is in the rule's allowed types
    return tempRule.pageTypes.includes(pageCategory);
  });
}

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
  
  console.log(`  Analyzing page type: ${pageCategory || 'unknown'}`);
  
  // Track LLM usage
  let llmUsageCount = 0;
  
  // Group rules by dimension
  let ruleGroups = {
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
    
    // Find and replace definitional content rule in content rules if it exists
    const definitionalIndex = ruleGroups.content.findIndex(Rule => {
      const rule = new Rule();
      return rule.id === 'definitional-content';
    });
    
    if (definitionalIndex >= 0) {
      // Replace with LLM version
      ruleGroups.content[definitionalIndex] = DefinitionalContentLLMRule;
      console.log('  Using LLM-enabled version of definitional content rule');
    } else {
      // Add it if not present
      ruleGroups.content.push(DefinitionalContentLLMRule);
      console.log('  Added LLM-enabled definitional content rule');
    }
    
    // Find and replace case studies rule in content rules if it exists
    const caseStudiesIndex = ruleGroups.content.findIndex(Rule => {
      const rule = new Rule();
      return rule.id === 'case-studies';
    });
    
    if (caseStudiesIndex >= 0) {
      // Replace with LLM version
      ruleGroups.content[caseStudiesIndex] = CaseStudiesLLMRule;
      console.log('  Using LLM-enabled version of case studies rule');
    } else {
      // Add it if not present
      ruleGroups.content.push(CaseStudiesLLMRule);
      console.log('  Added LLM-enabled case studies rule');
    }
    
    // Find and replace comparison content rule in authority rules if it exists
    const comparisonIndex = ruleGroups.authority.findIndex(Rule => {
      const rule = new Rule();
      return rule.id === 'comparison-content';
    });
    
    if (comparisonIndex >= 0) {
      // Replace with LLM version
      ruleGroups.authority[comparisonIndex] = ComparisonContentLLMRule;
      console.log('  Using LLM-enabled version of comparison content rule');
    } else {
      // Add it if not present
      ruleGroups.authority.push(ComparisonContentLLMRule);
      console.log('  Added LLM-enabled comparison content rule');
    }
  }
  
  // Filter rules by page type for each dimension
  Object.keys(ruleGroups).forEach(dimension => {
    const originalCount = ruleGroups[dimension].length;
    ruleGroups[dimension] = filterRulesByPageType(ruleGroups[dimension], pageCategory);
    const filteredCount = ruleGroups[dimension].length;
    
    if (originalCount !== filteredCount) {
      console.log(`  ${dimension}: ${filteredCount}/${originalCount} rules apply to ${pageCategory}`);
    }
  });
  
  const dimensionResults = {};
  const allIssues = [];
  const allRecommendations = [];
  const allRuleResults = {};
  
  // Process each dimension in parallel
  const dimensionPromises = Object.entries(ruleGroups).map(async ([dimension, rules]) => {
    if (rules.length === 0) {
      console.log(`  Skipping ${dimension} - no applicable rules`);
      return;
    }
    
    const ruleResults = [];
    const ruleDetails = [];
    
    // Run rules in parallel within each dimension
    const rulePromises = rules.map(async (Rule) => {
      try {
        // Initialize rule with LLM clients if it's an LLM-enabled rule
        // Check if it's one of the known LLM rules
        const isLLMRule = [
          'DefinitionalContentLLMRule', 
          'CaseStudiesLLMRule', 
          'ComparisonContentLLMRule',
          'InDepthGuidesLLMRule'
        ].includes(Rule.name);
        
        const rule = isLLMRule ? new Rule(llmClients) : new Rule();
        
        console.log(`  Running ${dimension} rule: ${rule.name}`);
          
        const result = await rule.evaluate(pageContent, options);
        
        // Track LLM usage
        if (result.llmUsed) {
          llmUsageCount++;
          console.log(`    → Used LLM for ${rule.name}`);
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
    if (ruleResults.length > 0) {
      const aggregatedScore = aggregator.aggregate(ruleResults, dimension, ruleDetails);
      dimensionResults[dimension] = aggregatedScore;
      allRuleResults[dimension] = ruleResults;
    }
  });
  
  // Wait for all dimensions to complete
  await Promise.all(dimensionPromises);
  
  // Extract dimension scores - use null for dimensions with no executed rules
  const scores = {
    technical: dimensionResults.technical?.finalScore ?? null,
    content: dimensionResults.content?.finalScore ?? null,
    authority: dimensionResults.authority?.finalScore ?? null,
    quality: dimensionResults.quality?.finalScore ?? null
  };
  
  // Count total rules executed
  const totalRulesExecuted = Object.values(allRuleResults).reduce((sum, rules) => sum + rules.length, 0);
  
  // Log analysis summary
  console.log(`  Rules executed: ${totalRulesExecuted} (${llmUsageCount} with LLM)`);
  
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