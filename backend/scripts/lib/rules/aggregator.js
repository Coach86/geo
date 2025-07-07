/**
 * Rule aggregator for calculating dimension scores
 */
class RuleAggregator {
  /**
   * Aggregate multiple rule results into a single dimension score
   */
  aggregate(results, dimension, ruleDetails) {
    if (results.length === 0) {
      return this.createEmptyScore(dimension);
    }
    
    // Calculate weighted average
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const allEvidence = [];
    const allIssues = [];
    
    const subScores = results.map((result, index) => {
      const ruleInfo = ruleDetails[index];
      
      // Accumulate weighted scores
      totalWeightedScore += result.contribution;
      totalWeight += result.weight;
      
      // Collect evidence
      allEvidence.push(...result.evidence);
      
      // Collect issues with rule context
      if (result.issues) {
        result.issues.forEach(issue => {
          allIssues.push({
            ruleId: ruleInfo.id,
            dimension: dimension,
            ...issue
          });
        });
      }
      
      return {
        ruleId: ruleInfo.id,
        name: ruleInfo.name,
        value: result.score,
        weight: result.weight,
        maxValue: result.maxScore,
        contribution: result.contribution,
        evidence: result.evidence
      };
    });
    
    // Calculate final score
    const finalScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight * 100) : 0;
    const maxPossibleScore = 100;
    
    // Sort issues by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allIssues.sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));
    
    return {
      dimension,
      finalScore,
      maxPossibleScore,
      ruleResults: results,
      evidence: allEvidence,
      issues: allIssues,
      calculationDetails: {
        formula: 'Weighted Average: Σ(rule_score × rule_weight) / Σ(rule_weights)',
        subScores,
        explanation: this.generateExplanation(dimension, finalScore, results),
        finalScore
      }
    };
  }
  
  /**
   * Create empty score when no rules apply
   */
  createEmptyScore(dimension) {
    return {
      dimension,
      finalScore: undefined, // Use undefined to distinguish from calculated score of 0
      maxPossibleScore: 100,
      ruleResults: [],
      evidence: ['No applicable rules for this dimension'],
      issues: [],
      calculationDetails: {
        formula: 'No applicable rules',
        subScores: [],
        explanation: `No ${dimension} rules applied to this page`,
        finalScore: undefined
      }
    };
  }
  
  /**
   * Generate human-readable explanation of the score
   */
  generateExplanation(dimension, finalScore, results) {
    const scoreBand = this.getScoreBand(finalScore);
    const topContributors = results
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 2)
      .map(r => `${r.score}% on ${r.evidence[0]?.message || r.ruleName}`);
    
    const explanations = {
      technical: `Technical optimization is ${scoreBand}. ${topContributors.join(', ')}`,
      content: `Content quality for AI is ${scoreBand}. ${topContributors.join(', ')}`,
      authority: `The page has ${scoreBand} authority signals. ${topContributors.join(', ')}`,
      quality: `AI visibility metrics are ${scoreBand}. ${topContributors.join(', ')}`
    };
    
    return explanations[dimension] || `Overall ${dimension} score is ${scoreBand}`;
  }
  
  /**
   * Convert score to qualitative band
   */
  getScoreBand(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'moderate';
    if (score >= 20) return 'poor';
    return 'very poor';
  }
}

module.exports = {
  RuleAggregator
};