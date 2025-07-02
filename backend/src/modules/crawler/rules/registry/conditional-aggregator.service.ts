import { Injectable, Logger } from '@nestjs/common';
import { RuleResult, RuleDimension } from '../interfaces/rule.interface';
import { AggregatedScore } from '../interfaces/aggregated-score.interface';

/**
 * Conditional aggregator that uses threshold-based scoring from the plan
 * instead of weighted averages
 */
@Injectable()
export class ConditionalAggregatorService {
  private readonly logger = new Logger(ConditionalAggregatorService.name);
  
  /**
   * Aggregate multiple rule results using conditional thresholds
   */
  aggregate(
    results: RuleResult[], 
    dimension: RuleDimension,
    ruleDetails: Array<{ id: string; name: string }>
  ): AggregatedScore {
    if (results.length === 0) {
      return this.createEmptyScore(dimension);
    }
    
    // For most dimensions, use weighted average (except authority which uses conditional)
    const useWeightedAverage = dimension !== 'authority';
    
    let finalScore: number;
    let formula: string;
    let explanation: string;
    
    let totalWeight = 0;
    
    if (useWeightedAverage) {
      // Calculate weighted average for most dimensions
      let totalWeightedScore = 0;
      
      results.forEach(result => {
        totalWeightedScore += result.score * result.weight;
        totalWeight += result.weight;
      });
      
      finalScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
      formula = 'Weighted Average: Σ(rule_score × rule_weight) / Σ(rule_weights)';
      explanation = `Weighted average of ${results.length} rules`;
    } else {
      // Use conditional logic for authority
      const aggregator = this.getAggregator(dimension);
      const aggregationResult = aggregator(results);
      finalScore = aggregationResult.finalScore;
      explanation = aggregationResult.explanation;
      formula = this.getConditionalFormula(dimension);
      
      // Calculate total weight for contribution calculation
      results.forEach(result => {
        totalWeight += result.weight;
      });
    }
    
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
      const contribution = useWeightedAverage 
        ? (result.score * result.weight) / (totalWeight || 1)
        : result.contribution;
      
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
   * Get the appropriate aggregator for each dimension
   */
  private getAggregator(dimension: RuleDimension): (results: RuleResult[]) => { finalScore: number; explanation: string } {
    switch (dimension) {
      case 'authority':
        return this.aggregateAuthority.bind(this);
      case 'freshness':
        return this.aggregateFreshness.bind(this);
      case 'structure':
        return this.aggregateStructure.bind(this);
      case 'brandAlignment':
        return this.aggregateBrand.bind(this);
      default:
        return this.aggregateDefault.bind(this);
    }
  }
  
  /**
   * Authority scoring based on plan:
   * - 100: High-authority domain + credentialed author + 2+ citations
   * - 80: Named expert author + domain authority OR 2+ citations
   * - 60: Moderate authority OR 1 credible citation
   * - 40: Little trust; generic links; vague author
   * - 20: No authority signals
   */
  private aggregateAuthority(results: RuleResult[]): { finalScore: number; explanation: string } {
    // Extract signals from rule results
    const signals = this.extractAuthoritySignals(results);
    
    // Apply conditional logic
    if (signals.domainAuthority === 'high' && signals.hasCredentialedAuthor && signals.citationCount >= 2) {
      return { 
        finalScore: 100, 
        explanation: 'High-authority domain with credentialed author and multiple citations' 
      };
    }
    
    if ((signals.hasNamedAuthor && signals.domainAuthority !== 'low') || signals.citationCount >= 2) {
      return { 
        finalScore: 80, 
        explanation: signals.citationCount >= 2 
          ? 'Multiple credible citations found'
          : 'Named expert author with domain authority' 
      };
    }
    
    if (signals.domainAuthority === 'medium' || signals.citationCount >= 1) {
      return { 
        finalScore: 60, 
        explanation: signals.citationCount >= 1 
          ? 'At least one credible citation found'
          : 'Moderate domain authority' 
      };
    }
    
    if (signals.hasAuthor || signals.hasLinks) {
      return { 
        finalScore: 40, 
        explanation: 'Limited authority signals - vague author or generic links' 
      };
    }
    
    return { 
      finalScore: 20, 
      explanation: 'No authority signals found' 
    };
  }
  
  /**
   * Freshness scoring - use weighted average like other dimensions
   * The update-frequency rule already implements the fixed thresholds
   */
  private aggregateFreshness(results: RuleResult[]): { finalScore: number; explanation: string } {
    // This method is only called when using conditional logic for authority
    // For freshness, we use weighted average in the main aggregate method
    return {
      finalScore: 0, // Not used
      explanation: 'Freshness uses weighted average of rule scores'
    };
  }
  
  /**
   * Structure scoring based on plan:
   * - 100: Perfect hierarchy, full schema; avg ≤20 words/sentence
   * - 80: Minor gaps, partial schema; avg ≤25 words/sentence
   * - 60: Some hierarchy issues, basic schema; avg ≤30 words/sentence
   * - 40: Multiple H1s, messy HTML, minimal schema; avg >30 words/sentence
   * - 20: No meaningful structure or schema
   */
  private aggregateStructure(results: RuleResult[]): { finalScore: number; explanation: string } {
    const signals = this.extractStructureSignals(results);
    
    if (signals.perfectHierarchy && signals.hasFullSchema && signals.avgSentenceWords <= 20) {
      return {
        finalScore: 100,
        explanation: 'Perfect heading hierarchy with comprehensive schema and excellent readability'
      };
    }
    
    if (signals.goodHierarchy && signals.hasSchema && signals.avgSentenceWords <= 25) {
      return {
        finalScore: 80,
        explanation: 'Good structure with minor gaps, partial schema, and good readability'
      };
    }
    
    if (signals.hasBasicStructure && signals.hasSchema && signals.avgSentenceWords <= 30) {
      return {
        finalScore: 60,
        explanation: 'Basic structure with some issues but acceptable readability'
      };
    }
    
    if (signals.hasStructure || signals.avgSentenceWords > 30) {
      return {
        finalScore: 40,
        explanation: 'Poor structure - multiple H1s or poor readability'
      };
    }
    
    return {
      finalScore: 20,
      explanation: 'No meaningful structure or schema found'
    };
  }
  
  /**
   * Brand alignment - needs more nuanced scoring
   */
  private aggregateBrand(results: RuleResult[]): { finalScore: number; explanation: string } {
    const signals = this.extractBrandSignals(results);
    
    if (signals.perfectAlignment && signals.noIssues) {
      return {
        finalScore: 100,
        explanation: 'Flawless brand alignment across all dimensions'
      };
    }
    
    if (signals.goodAlignment && signals.minorIssues) {
      return {
        finalScore: 80,
        explanation: 'Good brand alignment with minor tone or terminology drift'
      };
    }
    
    if (signals.someAlignment && signals.outdatedElements) {
      return {
        finalScore: 60,
        explanation: 'Some brand alignment but outdated or missing elements'
      };
    }
    
    if (signals.weakAlignment) {
      return {
        finalScore: 40,
        explanation: 'Significant brand mismatch detected'
      };
    }
    
    return {
      finalScore: 20,
      explanation: 'Completely off-brand content'
    };
  }
  
  /**
   * Default aggregator - fallback to weighted average
   */
  private aggregateDefault(results: RuleResult[]): { finalScore: number; explanation: string } {
    const totalWeightedScore = results.reduce((sum, r) => sum + r.contribution, 0);
    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
    const finalScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    
    return {
      finalScore,
      explanation: 'Score calculated using weighted average of rules'
    };
  }
  
  // Helper methods to extract signals from rule results
  
  private extractAuthoritySignals(results: RuleResult[]): any {
    const signals: any = {
      hasAuthor: false,
      hasNamedAuthor: false,
      hasCredentialedAuthor: false,
      citationCount: 0,
      domainAuthority: 'low',
      hasLinks: false
    };
    
    results.forEach(result => {
      // Check evidence for signals
      result.evidence.forEach(e => {
        if (e.includes('Author found:')) {
          signals.hasAuthor = true;
          if (!e.includes('Name detected but not extracted')) {
            signals.hasNamedAuthor = true;
          }
        }
        if (e.includes('professional credentials')) {
          signals.hasCredentialedAuthor = true;
        }
        if (e.includes('citations found')) {
          const match = e.match(/(\d+) citations/);
          if (match) {
            signals.citationCount = parseInt(match[1]);
          }
        }
        if (e.includes('domain authority: high')) {
          signals.domainAuthority = 'high';
        } else if (e.includes('domain authority: medium')) {
          signals.domainAuthority = 'medium';
        }
        if (e.includes('links found')) {
          signals.hasLinks = true;
        }
      });
    });
    
    return signals;
  }
  
  private extractStructureSignals(results: RuleResult[]): any {
    const signals: any = {
      perfectHierarchy: false,
      goodHierarchy: false,
      hasBasicStructure: false,
      hasStructure: false,
      hasFullSchema: false,
      hasSchema: false,
      avgSentenceWords: 30
    };
    
    results.forEach(result => {
      result.evidence.forEach(e => {
        if (e.includes('Perfect heading hierarchy')) {
          signals.perfectHierarchy = true;
        } else if (e.includes('Good heading hierarchy')) {
          signals.goodHierarchy = true;
        } else if (e.includes('heading')) {
          signals.hasBasicStructure = true;
        }
        if (e.includes('comprehensive schema')) {
          signals.hasFullSchema = true;
          signals.hasSchema = true;
        } else if (e.includes('schema')) {
          signals.hasSchema = true;
        }
        const avgMatch = e.match(/Average (\d+) words per sentence/);
        if (avgMatch) {
          signals.avgSentenceWords = parseInt(avgMatch[1]);
        }
      });
    });
    
    return signals;
  }
  
  private extractBrandSignals(results: RuleResult[]): any {
    const signals: any = {
      perfectAlignment: false,
      goodAlignment: false,
      someAlignment: false,
      weakAlignment: false,
      noIssues: true,
      minorIssues: false,
      outdatedElements: false
    };
    
    results.forEach(result => {
      // Check scores
      if (result.score >= 90) {
        signals.perfectAlignment = true;
      } else if (result.score >= 70) {
        signals.goodAlignment = true;
      } else if (result.score >= 50) {
        signals.someAlignment = true;
      } else {
        signals.weakAlignment = true;
      }
      
      // Check issues
      if (result.issues && result.issues.length > 0) {
        signals.noIssues = false;
        if (result.issues.every(i => i.severity === 'low')) {
          signals.minorIssues = true;
        }
        if (result.issues.some(i => i.description.includes('outdated'))) {
          signals.outdatedElements = true;
        }
      }
    });
    
    return signals;
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
  
  /**
   * Get the conditional formula description for a dimension
   */
  private getConditionalFormula(dimension: RuleDimension): string {
    const formulas: Record<RuleDimension, string> = {
      authority: 'Conditional: 100 if (high domain + credentialed author + 2+ citations), 80 if (named author + domain) OR 2+ citations, 60 if moderate authority OR 1 citation, 40 if limited signals, 20 if none',
      freshness: 'Fixed thresholds: 100 if ≤90 days, 80 if 91-180 days, 60 if 181-365 days, 40 if >365 days, 20 if no date',
      structure: 'Conditional: 100 if (perfect hierarchy + full schema + ≤20 words/sentence), 80 if (good + partial schema + ≤25 words), 60 if (basic + ≤30 words), 40 if poor, 20 if none',
      brandAlignment: 'Conditional: 100 if flawless alignment, 80 if minor drift, 60 if some missing elements, 40 if significant mismatch, 20 if off-brand'
    };
    
    return formulas[dimension] || 'Weighted average';
  }
}