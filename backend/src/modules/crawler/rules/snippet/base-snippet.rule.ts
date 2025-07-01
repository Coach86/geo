import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';
import { ScoreIssue } from '../../schemas/content-score.schema';

/**
 * Base abstract class for snippet-extractability rules
 */
export abstract class BaseSnippetRule extends BaseRule {
  dimension = 'snippetExtractability' as const;
  
  protected generateIssue(
    severity: 'critical' | 'high' | 'medium' | 'low',
    description: string,
    recommendation: string
  ): ScoreIssue {
    return {
      dimension: 'snippetExtractability',
      severity,
      description,
      recommendation
    };
  }
}