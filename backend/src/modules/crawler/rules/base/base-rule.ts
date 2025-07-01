import { Logger } from '@nestjs/common';
import { 
  ScoringRule, 
  RuleContext, 
  RuleResult, 
  RuleDimension, 
  RuleApplicability,
  RuleIssue 
} from '../interfaces/rule.interface';

export abstract class BaseRule implements ScoringRule {
  protected readonly logger: Logger;
  
  abstract id: string;
  abstract name: string;
  abstract dimension: RuleDimension;
  abstract description: string;
  abstract applicability: RuleApplicability;
  abstract priority: number;
  
  weight: number = 1.0;
  config: Record<string, any> = {};
  
  constructor(config?: Record<string, any>) {
    this.logger = new Logger(this.constructor.name);
    if (config) {
      this.config = config;
      if (config.weight !== undefined) {
        this.weight = config.weight;
      }
    }
  }
  
  abstract evaluate(context: RuleContext): Promise<RuleResult>;
  
  appliesTo(context: RuleContext): boolean {
    const { scope, categories, domains } = this.applicability;
    
    // All pages
    if (scope === 'all') {
      return true;
    }
    
    // Category-specific
    if (scope === 'category' && categories) {
      return categories.includes(context.pageCategory.type);
    }
    
    // Domain-specific
    if (scope === 'domain' && domains) {
      return domains.some(domain => context.domain.includes(domain));
    }
    
    return false;
  }
  
  protected createResult(
    score: number,
    maxScore: number,
    evidence: string[],
    details: Record<string, any>,
    issues?: RuleIssue[]
  ): RuleResult {
    const contribution = (score / 100) * this.weight * maxScore;
    
    return {
      score,
      maxScore,
      weight: this.weight,
      contribution,
      passed: score >= 60, // Default passing threshold
      evidence,
      details,
      issues
    };
  }
  
  protected createIssue(
    severity: 'critical' | 'high' | 'medium' | 'low',
    description: string,
    recommendation: string
  ): RuleIssue {
    return {
      severity,
      description,
      recommendation
    };
  }
}