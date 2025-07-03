import { Injectable } from '@nestjs/common';
import { BaseStructureRule } from './base-structure.rule';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';
import { PAGE_CATEGORIES } from '../constants/page-categories';

@Injectable()
export class ReadabilityRule extends BaseStructureRule {
  id = 'structure-content-length';
  name = 'Content Length';
  description = 'Evaluates page content length and completeness';
  applicability = { 
    scope: 'all' as const
  };
  priority = 8;
  weight = 0.15;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { pageSignals } = context;
    
    const issues = [];
    const evidence = [];
    let score = 100; // Start with perfect score

    // Check for minimum content length
    const wordCount = pageSignals.structure.wordCount || 0;
    if (wordCount === 0) {
      score = 0;
      issues.push(this.generateIssue(
        'critical',
        'No content found on page',
        'Add meaningful text content to the page'
      ));
      evidence.push('No content detected');
    } else if (wordCount < 100) {
      score = 20;
      evidence.push(`Very limited content: ${wordCount} words (target: 300+ words)`);
      issues.push(this.generateIssue(
        'high',
        'Page has extremely little content',
        'Add substantial content to reach at least 300 words'
      ));
    } else if (wordCount < 200) {
      score = 40;
      evidence.push(`Limited content: ${wordCount} words (target: 300+ words)`);
      issues.push(this.generateIssue(
        'medium',
        'Page has insufficient content',
        'Add more comprehensive content to reach 300+ words'
      ));
    } else if (wordCount < 300) {
      score = 70;
      evidence.push(`Below target content: ${wordCount} words (target: 300+ words)`);
      issues.push(this.generateIssue(
        'low',
        'Page content is below recommended length',
        'Consider adding more detailed content to reach 300+ words'
      ));
    } else {
      score = 100;
      evidence.push(`Sufficient content length: ${wordCount} words (target: 300+ words)`);
    }

    return this.createResult(
      score,
      100,
      evidence,
      { wordCount },
      issues
    );
  }
}