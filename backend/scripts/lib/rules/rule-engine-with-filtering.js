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
  
  console.log(`  🎯 Analyzing page type: ${pageCategory || 'unknown'} (${analysisLevel || 'full'} analysis)`);
  
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
  
  // Process each dimension sequentially for proper logging order
  for (const [dimension, rules] of Object.entries(ruleGroups)) {
    if (rules.length === 0) {
      console.log(`  ⏭️  Skipping ${dimension.toUpperCase()} - no applicable rules`);
      continue;
    }
    
    console.log(`\n  📏 === ${dimension.toUpperCase()} DIMENSION ===`);
    
    const ruleResults = [];
    const ruleDetails = [];
    
    // Run rules sequentially within each dimension for proper logging order
    const ruleOutcomes = [];
    
    for (const Rule of rules) {
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
        
        console.log(`  [${dimension.toUpperCase()}] ${rule.name}`);
          
        // LLM rules use different signature: evaluate(pageContent, options)
        // Standard rules use: evaluate(url, content, options)
        const result = isLLMRule 
          ? await rule.evaluate(pageContent, options)
          : await rule.evaluate(pageContent.url, pageContent, options);
        
        // Track LLM usage
        if (result.llmUsed) {
          llmUsageCount++;
          console.log(`    ├─ 🤖 LLM Used`);
        }
        
        // Log rule results with better formatting
        console.log(`    ├─ 📊 Score: ${result.score}/100`);
        
        // Log issues if any
        if (result.issues && result.issues.length > 0) {
          console.log(`    ├─ ⚠️  Issues (${result.issues.length}):`);
          result.issues.forEach((issue, idx) => {
            const isLast = idx === result.issues.length - 1;
            const prefix = isLast ? '    │  └─' : '    │  ├─';
            const severity = issue.severity === 'critical' ? '🔴' : 
                           issue.severity === 'high' ? '🟠' : 
                           issue.severity === 'medium' ? '🟡' : '🟢';
            console.log(`${prefix} ${severity} [${issue.severity}] ${issue.description}`);
          });
        }
        
        // Log recommendations if any
        if (result.recommendations && result.recommendations.length > 0) {
          console.log(`    ├─ 💡 Recommendations (${result.recommendations.length}):`);
          result.recommendations.forEach((rec, idx) => {
            const isLast = idx === result.recommendations.length - 1;
            const prefix = isLast ? '    │  └─' : '    │  ├─';
            console.log(`${prefix} ${rec}`);
          });
        }
        
        // Log key evidence items (first 3)
        if (result.evidence && result.evidence.length > 0) {
          console.log(`    ├─ 📋 Evidence (${result.evidence.length} items, showing ${Math.min(3, result.evidence.length)}):`);
          result.evidence.slice(0, 3).forEach((ev, idx) => {
            const isLast = idx === Math.min(2, result.evidence.length - 1);
            const prefix = isLast ? '    │  └─' : '    │  ├─';
            
            if (typeof ev === 'string') {
              console.log(`${prefix} ${ev}`);
            } else if (ev && typeof ev === 'object') {
              // Handle object-style evidence
              if (ev.label && ev.value !== undefined) {
                console.log(`${prefix} ${ev.label}: ${ev.value}`);
              } else if (ev.type && ev.message) {
                // Handle evidence with type and message
                const icon = ev.type === 'success' ? '✓' : ev.type === 'error' ? '✗' : ev.type === 'warning' ? '⚠' : 'ℹ';
                console.log(`${prefix} ${icon} ${ev.message}`);
              } else if (ev.component && ev.points !== undefined) {
                // Handle score breakdown evidence
                const pointsStr = ev.points > 0 ? `+${ev.points}` : `${ev.points}`;
                console.log(`${prefix} ${ev.component}: ${pointsStr} points`);
              } else {
                // Fallback for other object formats
                console.log(`${prefix} ${JSON.stringify(ev)}`);
              }
            }
          });
          if (result.evidence.length > 3) {
            console.log(`    │  ... and ${result.evidence.length - 3} more items`);
          }
        }
        
        console.log(`    └─ ✅ Complete`);
        
        ruleOutcomes.push({
          result,
          rule: {
            id: rule.id,
            name: rule.name
          }
        });
        
      } catch (error) {
        console.error(`Error running rule ${Rule.name}:`, error);
      }
    }
    
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
      
      // Log dimension summary
      console.log(`\n  📊 ${dimension.toUpperCase()} DIMENSION SUMMARY:`);
      console.log(`     Final Score: ${aggregatedScore.finalScore}/100`);
      console.log(`     Rules Executed: ${ruleResults.length}`);
      console.log(`     Issues Found: ${ruleResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0)}`);
      console.log(`     ─────────────────────────────`);
    }
  }
  
  // Extract dimension scores - use null for dimensions with no executed rules
  const scores = {
    technical: dimensionResults.technical?.finalScore ?? null,
    content: dimensionResults.content?.finalScore ?? null,
    authority: dimensionResults.authority?.finalScore ?? null,
    quality: dimensionResults.quality?.finalScore ?? null
  };
  
  // Count total rules executed
  const totalRulesExecuted = Object.values(allRuleResults).reduce((sum, rules) => sum + rules.length, 0);
  
  // Calculate overall statistics
  const totalIssues = allIssues.length;
  const criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
  const highIssues = allIssues.filter(i => i.severity === 'high').length;
  
  // Log overall analysis summary
  console.log(`\n  🎯 === OVERALL ANALYSIS SUMMARY ===`);
  console.log(`     📊 Dimension Scores:`);
  console.log(`        Technical: ${scores.technical !== null ? scores.technical + '/100' : 'N/A'}`);
  console.log(`        Content:   ${scores.content !== null ? scores.content + '/100' : 'N/A'}`);
  console.log(`        Authority: ${scores.authority !== null ? scores.authority + '/100' : 'N/A'}`);
  console.log(`        Quality:   ${scores.quality !== null ? scores.quality + '/100' : 'N/A'}`);
  console.log(`     ─────────────────────────────`);
  console.log(`     ✅ Total Rules Executed: ${totalRulesExecuted}`);
  console.log(`     🤖 LLM-Enhanced Rules: ${llmUsageCount}`);
  console.log(`     ⚠️  Total Issues: ${totalIssues} (🔴 ${criticalIssues} critical, 🟠 ${highIssues} high)`);
  console.log(`     💡 Total Recommendations: ${allRecommendations.length}`);
  console.log(`  =====================================\n`);
  
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