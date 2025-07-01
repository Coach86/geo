import { Injectable } from '@nestjs/common';
import { BaseSnippetRule } from './base-snippet.rule';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';
import { PAGE_CATEGORIES } from '../constants/page-categories';

@Injectable()
export class ListContentRule extends BaseSnippetRule {
  id = 'snippet-list-content';
  name = 'List Content';
  description = 'Evaluates presence of lists for featured snippets';
  applicability = { 
    scope: 'category' as const,
    categories: [
      PAGE_CATEGORIES.BLOG_ARTICLE,
      PAGE_CATEGORIES.DOCUMENTATION_HELP,
      PAGE_CATEGORIES.FAQ,
      PAGE_CATEGORIES.NAVIGATION_CATEGORY,
      PAGE_CATEGORIES.UNKNOWN
    ]
  };
  priority = 9;
  weight = 0.3;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { pageSignals, pageCategory } = context;
    const listCount = pageSignals.snippet.listItemCount;
    
    const issues = [];
    const evidence = [];
    let score = 0;

    // Determine optimal list count based on category
    const isListHeavyCategory = [
      PAGE_CATEGORIES.DOCUMENTATION_HELP,
      PAGE_CATEGORIES.FAQ
    ].includes(pageCategory.type as any);
    
    if (listCount === 0) {
      if (isListHeavyCategory) {
        score = 30;
        issues.push(this.generateIssue(
          'high',
          'No lists found in content that typically benefits from lists',
          'Add numbered or bulleted lists to structure information'
        ));
      } else {
        score = 60;
        issues.push(this.generateIssue(
          'low',
          'No lists found',
          'Consider using lists to organize information for better snippet extraction'
        ));
      }
      evidence.push('No lists detected');
    } else if (listCount >= 1 && listCount <= 3) {
      score = 100;
      evidence.push(`Optimal list usage: ${listCount} list(s) found`);
    } else if (listCount >= 4 && listCount <= 6) {
      score = 85;
      evidence.push(`Good list usage: ${listCount} lists found`);
    } else {
      score = 70;
      evidence.push(`Many lists: ${listCount} lists found`);
      issues.push(this.generateIssue(
        'low',
        'Excessive use of lists may dilute content focus',
        'Consider consolidating similar lists or converting some to prose'
      ));
    }

    // Check for extractable blocks
    const extractableBlocks = pageSignals.snippet.stepCount + pageSignals.snippet.bulletPoints;
    if (extractableBlocks > 0) {
      evidence.push(`${extractableBlocks} extractable content blocks identified`);
    }

    return this.createResult(
      score,
      100,
      evidence,
      { listCount, extractableBlocks },
      issues
    );
  }
}