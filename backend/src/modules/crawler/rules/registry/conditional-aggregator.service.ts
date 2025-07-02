import { Injectable, Logger } from '@nestjs/common';
import { RuleResult, RuleDimension } from '../interfaces/rule.interface';
import { AggregatedScore } from '../interfaces/aggregated-score.interface';

/**
 * Rule aggregator that combines multiple rule results using weighted averages
 * Respects the actual scores calculated by individual rules
 */
@Injectable()
export class ConditionalAggregatorService {
  private readonly logger = new Logger(ConditionalAggregatorService.name);
  
  /**
   * Aggregate multiple rule results using weighted averages
   */
  aggregate(
    results: RuleResult[], 
    dimension: RuleDimension,
    ruleDetails: Array<{ id: string; name: string }>
  ): AggregatedScore {
    if (results.length === 0) {
      return this.createEmptyScore(dimension);
    }
    
    // Always use weighted average for all dimensions
    // Previously, some dimensions used conditional logic that parsed evidence text,
    // but this was removed as it ignored the actual rule scores
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    results.forEach(result => {
      totalWeightedScore += result.score * result.weight;
      totalWeight += result.weight;
    });
    
    const finalScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    const formula = 'Weighted Average: Σ(rule_score × rule_weight) / Σ(rule_weights)';
    const explanation = `Weighted average of ${results.length} rules`;
    
    // Collect all evidence and issues
    const allEvidence: string[] = [];
    const allIssues: any[] = [];
    
    const subScores = results.map((result, index) => {
      const ruleInfo = ruleDetails[index];
      
      // Collect evidence
      allEvidence.push(...result.evidence);
      
      // Collect issues with rule context
      if (result.issues) {
        result.issues.forEach(issue => {
          allIssues.push({
            ruleId: ruleInfo.id,
            dimension: dimension, // Ensure dimension is always set
            ...issue
          });
        });
      }
      
      // Calculate actual contribution for weighted average
      const contribution = (result.score * result.weight) / (totalWeight || 1);
      
      return {
        ruleId: ruleInfo.id,
        name: ruleInfo.name,
        value: result.score,
        weight: result.weight,
        maxValue: result.maxScore,
        contribution: Math.round(contribution * 10) / 10, // Round to 1 decimal
        evidence: result.evidence
      };
    });
    
    // Sort issues by severity
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    allIssues.sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));
    
    return {
      dimension,
      finalScore,
      maxPossibleScore: 100,
      ruleResults: results,
      evidence: allEvidence,
      issues: allIssues,
      calculationDetails: {
        formula,
        subScores,
        explanation,
        finalScore
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
        explanation: `No ${dimension} rules applied to this page`,
        finalScore: 0
      }
    };
  }
}