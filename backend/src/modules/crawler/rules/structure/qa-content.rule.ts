import { Injectable } from '@nestjs/common';
import { BaseStructureRule } from './base-structure.rule';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';
import { PAGE_CATEGORIES } from '../constants/page-categories';

@Injectable()
export class QAContentRule extends BaseStructureRule {
  id = 'structure-qa-content';
  name = 'Q&A Content';
  description = 'Evaluates question-answer format content for featured snippets';
  applicability = { 
    scope: 'all' as const
  };
  priority = 8;
  weight = 0.1; // Adjusted weight as it's now part of structure dimension

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { pageSignals, pageCategory } = context;
    const qaBlockCount = pageSignals.snippet.qaBlockCount;
    
    const issues = [];
    const evidence = [];
    let score = 0;

    // FAQ pages should have Q&A blocks
    const isFAQ = pageCategory.type === PAGE_CATEGORIES.FAQ;
    
    if (qaBlockCount === 0) {
      if (isFAQ) {
        score = 20;
        issues.push(this.generateIssue(
          'critical',
          'No Q&A blocks found in FAQ content',
          'Structure content with clear questions and answers'
        ));
      } else {
        score = 0;
        issues.push(this.generateIssue(
          'low',
          'No Q&A blocks found',
          'Consider adding Q&A sections to improve content structure and searchability'
        ));
      }
      evidence.push('No Q&A blocks detected');
    } else if (qaBlockCount >= 1 && qaBlockCount <= 5) {
      score = 100;
      evidence.push(`Excellent Q&A usage: ${qaBlockCount} Q&A block(s) found`);
    } else if (qaBlockCount >= 6 && qaBlockCount <= 10) {
      score = 90;
      evidence.push(`Good Q&A usage: ${qaBlockCount} Q&A blocks found`);
    } else {
      score = 80;
      evidence.push(`Extensive Q&A usage: ${qaBlockCount} Q&A blocks found`);
      if (!isFAQ) {
        issues.push(this.generateIssue(
          'low',
          'Consider if all Q&A blocks are necessary',
          'Focus on the most important questions for your audience'
        ));
      }
    }

    // Bonus for appropriate Q&A usage in non-FAQ content
    if (!isFAQ && qaBlockCount > 0 && qaBlockCount <= 3) {
      evidence.push('Q&A format enhances snippet potential');
    }

    return this.createResult(
      score,
      100,
      evidence,
      { qaBlockCount, isFAQ },
      issues
    );
  }
}