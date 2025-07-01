import { Injectable } from '@nestjs/common';
import { BaseSnippetRule } from './base-snippet.rule';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';

@Injectable()
export class SentenceStructureRule extends BaseSnippetRule {
  id = 'snippet-sentence-structure';
  name = 'Sentence Structure for Snippets';
  description = 'Evaluates sentence length and structure for snippet extraction';
  applicability = { scope: 'all' as const };
  priority = 10;
  weight = 0.4;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { pageSignals } = context;
    const avgSentenceLength = pageSignals.snippet.avgSentenceLength;
    
    const issues = [];
    const evidence = [];
    let score = 0;

    // Optimal sentence length for snippets is 15-25 words
    if (avgSentenceLength === 0) {
      score = 0;
      issues.push(this.generateIssue(
        'critical',
        'No extractable sentences found',
        'Add clear, complete sentences to enable snippet extraction'
      ));
      evidence.push('No sentences detected');
    } else if (avgSentenceLength >= 15 && avgSentenceLength <= 25) {
      score = 100;
      evidence.push(`Optimal sentence length for snippets: ${avgSentenceLength.toFixed(1)} words`);
    } else if (avgSentenceLength >= 10 && avgSentenceLength < 15) {
      score = 80;
      evidence.push(`Good sentence length: ${avgSentenceLength.toFixed(1)} words`);
      issues.push(this.generateIssue(
        'low',
        'Sentences are slightly short for rich snippets',
        'Consider adding more descriptive detail to sentences'
      ));
    } else if (avgSentenceLength > 25 && avgSentenceLength <= 35) {
      score = 70;
      evidence.push(`Sentences slightly long: ${avgSentenceLength.toFixed(1)} words`);
      issues.push(this.generateIssue(
        'medium',
        'Sentences may be too long for optimal snippet extraction',
        'Break up longer sentences for better snippet display'
      ));
    } else if (avgSentenceLength < 10) {
      score = 50;
      evidence.push(`Sentences too short: ${avgSentenceLength.toFixed(1)} words`);
      issues.push(this.generateIssue(
        'high',
        'Sentences are too short for meaningful snippets',
        'Write more complete, descriptive sentences'
      ));
    } else {
      score = 40;
      evidence.push(`Sentences too long: ${avgSentenceLength.toFixed(1)} words`);
      issues.push(this.generateIssue(
        'high',
        'Sentences are too long for snippet extraction',
        'Significantly shorten sentences to 15-25 words'
      ));
    }

    return this.createResult(
      score,
      100,
      evidence,
      { avgSentenceLength },
      issues
    );
  }
}