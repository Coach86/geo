import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult, RuleDimension, RuleApplicability } from '../interfaces/rule.interface';
import { AUTHORITY_CONSTANTS } from '../../config/scoring-constants';

/**
 * Base authority rule that provides a minimum score for all content
 * This ensures all pages get some authority credit for existing
 */
export class BaseAuthorityRule extends BaseRule {
  id = 'base-authority';
  name = 'Base Authority Score';
  dimension: RuleDimension = 'authority';
  description = 'Base authority score for all content';
  priority = 1000; // Highest priority - always runs first
  weight = 0.2; // 20% of authority score (fixed base)
  
  applicability: RuleApplicability = {
    scope: 'all' // Applies to all pages
  };
  
  async evaluate(context: RuleContext): Promise<RuleResult> {
    // This rule always gives the base score
    const score = 100; // Full marks for this rule (will be weighted to 20% contribution)
    
    const evidence = ['Base authority score for published content'];
    const details = {
      baseScore: AUTHORITY_CONSTANTS.SCORES.BASE,
      reason: 'All published content receives base authority credit'
    };
    
    return this.createResult(score, 100, evidence, details);
  }
}