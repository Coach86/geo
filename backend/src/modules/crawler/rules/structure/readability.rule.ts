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
    scope: 'all' as const
  };
  priority = 8;
  weight = 0.15;

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
    } else if (avgSentenceWords < 5) {
      score = 30;
      evidence.push(`Very poor readability: Average ${avgSentenceWords.toFixed(1)} words per sentence (target: 15-20 words)`);
      issues.push(this.generateIssue(
        'high',
        'Sentences are too short and fragmented',
        'Write complete, meaningful sentences with 15-20 words each'
      ));
    } else if (avgSentenceWords < 10) {
      score = 50;
      evidence.push(`Poor readability: Average ${avgSentenceWords.toFixed(1)} words per sentence (target: 15-20 words)`);
      issues.push(this.generateIssue(
        'medium',
        'Sentences are too short for optimal readability',
        'Expand sentences to be more descriptive; aim for 15-20 words per sentence'
      ));
    } else if (avgSentenceWords < 15) {
      score = 70;
      evidence.push(`Fair readability: Average ${avgSentenceWords.toFixed(1)} words per sentence (target: 15-20 words)`);
      issues.push(this.generateIssue(
        'low',
        'Sentences are slightly short',
        'Consider adding more descriptive detail to reach 15-20 words per sentence'
      ));
    } else if (avgSentenceWords <= 20) {
      score = 100;
      evidence.push(`Excellent readability: Average ${avgSentenceWords.toFixed(1)} words per sentence (target: 15-20 words)`);
    } else if (avgSentenceWords <= 25) {
      score = 85;
      evidence.push(`Good readability: Average ${avgSentenceWords.toFixed(1)} words per sentence (target: 15-20 words)`);
      issues.push(this.generateIssue(
        'low',
        'Sentences are slightly long',
        'Consider breaking up longer sentences for better readability'
      ));
    } else if (avgSentenceWords <= 30) {
      score = 50;
      evidence.push(`Poor readability: Average ${avgSentenceWords.toFixed(1)} words per sentence (target: 15-20 words)`);
      issues.push(this.generateIssue(
        'medium',
        'Sentences are too long for optimal readability',
        'Break up long sentences; aim for 15-20 words per sentence'
      ));
    } else {
      score = 30;
      evidence.push(`Very poor readability: Average ${avgSentenceWords.toFixed(1)} words per sentence (target: 15-20 words)`);
      issues.push(this.generateIssue(
        'high',
        'Sentences are extremely long and difficult to read',
        'Significantly shorten sentences; use simpler sentence structures'
      ));
    }

    // Check for minimum content length
    const wordCount = pageSignals.structure.wordCount || 0;
    if (wordCount < 300 && score > 0) {
      const originalScore = score;
      score = Math.min(score, 70);
      evidence.push(`Limited content: ${wordCount} words (target: 300+ words, score capped at 70 from ${originalScore})`);
      issues.push(this.generateIssue(
        'medium',
        'Page has very little content',
        'Consider adding more comprehensive content (300+ words)'
      ));
    } else if (wordCount >= 300) {
      evidence.push(`Sufficient content length: ${wordCount} words (target: 300+ words)`);
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