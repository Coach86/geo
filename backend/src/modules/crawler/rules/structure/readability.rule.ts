import { Injectable } from '@nestjs/common';
import { BaseStructureRule } from './base-structure.rule';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';
import { PAGE_CATEGORIES } from '../constants/page-categories';

@Injectable()
export class ReadabilityRule extends BaseStructureRule {
  id = 'structure-readability';
  name = 'Content Readability';
  description = 'Evaluates text readability and sentence structure';
  applicability = { 
    scope: 'category' as const,
    categories: [
      PAGE_CATEGORIES.BLOG_ARTICLE,
      PAGE_CATEGORIES.DOCUMENTATION_HELP,
      PAGE_CATEGORIES.FAQ,
      PAGE_CATEGORIES.ABOUT_COMPANY,
      PAGE_CATEGORIES.CASE_STUDY,
      PAGE_CATEGORIES.UNKNOWN
    ]
  };
  priority = 8;
  weight = 0.3;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { pageSignals } = context;
    const avgSentenceWords = pageSignals.structure.avgSentenceWords;
    
    const issues = [];
    const evidence = [];
    let score = 0;

    // Evaluate sentence length for readability
    if (avgSentenceWords === 0) {
      score = 0;
      issues.push(this.generateIssue(
        'critical',
        'No readable text content found',
        'Add meaningful text content to the page'
      ));
      evidence.push('No text content detected');
    } else if (avgSentenceWords <= 15) {
      score = 100;
      evidence.push(`Excellent readability: ${avgSentenceWords.toFixed(1)} words per sentence`);
    } else if (avgSentenceWords <= 20) {
      score = 85;
      evidence.push(`Good readability: ${avgSentenceWords.toFixed(1)} words per sentence`);
    } else if (avgSentenceWords <= 25) {
      score = 70;
      evidence.push(`Fair readability: ${avgSentenceWords.toFixed(1)} words per sentence`);
      issues.push(this.generateIssue(
        'low',
        'Sentences are slightly long',
        'Consider breaking up longer sentences for better readability'
      ));
    } else if (avgSentenceWords <= 30) {
      score = 50;
      evidence.push(`Poor readability: ${avgSentenceWords.toFixed(1)} words per sentence`);
      issues.push(this.generateIssue(
        'medium',
        'Sentences are too long for optimal readability',
        'Break up long sentences; aim for 15-20 words per sentence'
      ));
    } else {
      score = 30;
      evidence.push(`Very poor readability: ${avgSentenceWords.toFixed(1)} words per sentence`);
      issues.push(this.generateIssue(
        'high',
        'Sentences are extremely long and difficult to read',
        'Significantly shorten sentences; use simpler sentence structures'
      ));
    }

    // Check for minimum content length
    const wordCount = pageSignals.structure.wordCount || 0;
    if (wordCount < 300 && score > 0) {
      evidence.push(`Limited content: ${wordCount} words`);
      issues.push(this.generateIssue(
        'medium',
        'Page has very little content',
        'Consider adding more comprehensive content (300+ words)'
      ));
      score = Math.min(score, 70);
    } else if (wordCount >= 300) {
      evidence.push(`Sufficient content length: ${wordCount} words`);
    }

    return this.createResult(
      score,
      100,
      evidence,
      { avgSentenceWords, wordCount },
      issues
    );
  }
}