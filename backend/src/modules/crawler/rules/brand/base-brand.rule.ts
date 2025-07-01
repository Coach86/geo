import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';
import { ScoreIssue } from '../../schemas/content-score.schema';

/**
 * Base abstract class for brand-alignment rules
 */
export abstract class BaseBrandRule extends BaseRule {
  dimension = 'brandAlignment' as const;
  
  protected generateIssue(
    severity: 'critical' | 'high' | 'medium' | 'low',
    description: string,
    recommendation: string
  ): ScoreIssue {
    return {
      dimension: 'brandAlignment',
      severity,
      description,
      recommendation
    };
  }
}