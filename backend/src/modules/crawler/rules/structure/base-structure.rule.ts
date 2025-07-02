import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult, RuleExecutionScope } from '../interfaces/rule.interface';
import { ScoreIssue } from '../../schemas/content-score.schema';

/**
 * Base abstract class for structure-related rules
 */
export abstract class BaseStructureRule extends BaseRule {
  dimension = 'structure' as const;
  executionScope: RuleExecutionScope = 'page'; // Default to page-level for structure rules
  
  protected generateIssue(
    severity: 'critical' | 'high' | 'medium' | 'low',
    description: string,
    recommendation: string
  ): ScoreIssue {
    return {
      dimension: 'structure',
      severity,
      description,
      recommendation
    };
  }
}