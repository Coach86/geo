import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult, RuleDimension, RuleApplicability } from '../interfaces/rule.interface';

/**
 * Base freshness rule that provides a minimum score for all content
 * This ensures all pages get some freshness credit
 */
export class BaseFreshnessRule extends BaseRule {
  id = 'base-freshness';
  name = 'Base Freshness Score';
  dimension: RuleDimension = 'freshness';
  description = 'Base freshness score for all content';
  priority = 1000; // Highest priority - always runs first
  weight = 0.1; // 10% of freshness score (fixed base)
  
  applicability: RuleApplicability = {
    scope: 'all' // Applies to all pages
  };
  
  async evaluate(context: RuleContext): Promise<RuleResult> {
    // This rule always gives the base score
    const score = 100; // Full marks for this rule (will be weighted to 10% contribution)
    
    const evidence = ['Base freshness score for published content'];
    const details = {
      baseScore: 10,
      reason: 'All published content receives base freshness credit'
    };
    
    return this.createResult(score, 100, evidence, details);
  }
}