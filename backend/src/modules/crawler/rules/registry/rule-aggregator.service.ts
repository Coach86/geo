import { Injectable, Logger } from '@nestjs/common';
import { RuleResult, RuleDimension } from '../interfaces/rule.interface';
import { AggregatedScore } from '../interfaces/aggregated-score.interface';

@Injectable()
export class RuleAggregatorService {
  private readonly logger = new Logger(RuleAggregatorService.name);
  
  /**
   * Aggregate multiple rule results into a single dimension score
   */
  aggregate(
    results: RuleResult[], 
    dimension: RuleDimension,
    ruleDetails: Array<{ id: string; name: string }>
  ): AggregatedScore {
    if (results.length === 0) {
      return this.createEmptyScore(dimension);
    }
    
    // Calculate weighted average
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const allEvidence: string[] = [];
    const allIssues: any[] = [];
    
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
    const finalScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    const maxPossibleScore = 100; // All dimensions have max 100
    
    // Sort issues by severity
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
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
        explanation: this.generateExplanation(dimension, finalScore, results)
      }
    };
  }
  
  /**
   * Create empty score when no rules apply
   */
  private createEmptyScore(dimension: RuleDimension): AggregatedScore {
    return {
      dimension,
      finalScore: 0,
      maxPossibleScore: 100,
      ruleResults: [],
      evidence: ['No applicable rules for this dimension'],
      issues: [],
      calculationDetails: {
        formula: 'No applicable rules',
        subScores: [],
        explanation: `No ${dimension} rules applied to this page`
      }
    };
  }
  
  /**
   * Generate human-readable explanation of the score
   */
  private generateExplanation(
    dimension: RuleDimension, 
    finalScore: number, 
    results: RuleResult[]
  ): string {
    const scoreBand = this.getScoreBand(finalScore);
    const topContributors = results
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 2)
      .map(r => `${r.score}% on ${r.evidence[0]?.substring(0, 50)}...`);
    
    const explanations: Record<RuleDimension, string> = {
      authority: `The page has ${scoreBand} authority signals. ${topContributors.join(', ')}`,
      freshness: `Content freshness is ${scoreBand}. ${topContributors.join(', ')}`,
      structure: `Page structure quality is ${scoreBand}. ${topContributors.join(', ')}`,
      snippetExtractability: `AI/Search snippet optimization is ${scoreBand}. ${topContributors.join(', ')}`,
      brandAlignment: `Brand alignment is ${scoreBand}. ${topContributors.join(', ')}`
    };
    
    return explanations[dimension] || `Overall ${dimension} score is ${scoreBand}`;
  }
  
  /**
   * Convert score to qualitative band
   */
  private getScoreBand(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'moderate';
    if (score >= 20) return 'poor';
    return 'very poor';
  }
}