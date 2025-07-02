import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult, RuleExecutionScope } from '../interfaces/rule.interface';
import { ScoreIssue } from '../../schemas/content-score.schema';

/**
 * Base abstract class for brand-alignment rules
 */
export abstract class BaseBrandRule extends BaseRule {
  dimension = 'brandAlignment' as const;
  executionScope: RuleExecutionScope = 'page'; // Default to page-level for brand rules
  
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