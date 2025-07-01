import { Injectable } from '@nestjs/common';
import { BaseBrandRule } from './base-brand.rule';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';

@Injectable()
export class KeywordAlignmentRule extends BaseBrandRule {
  id = 'brand-keyword-alignment';
  name = 'Brand Keyword Alignment';
  description = 'Evaluates alignment with key brand attributes';
  applicability = { scope: 'all' as const };
  priority = 9;
  weight = 0.6;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { pageSignals, projectContext } = context;
    const keyBrandAttributes = projectContext.keyBrandAttributes || [];
    const keywordMatches = pageSignals.brand.contextQuality || [];
    
    const issues: any[] = [];
    const evidence = [];
    let score = 0;

    if (keyBrandAttributes.length === 0) {
      // No keywords defined, give neutral score
      score = 70;
      evidence.push('No brand keywords defined for evaluation');
      return this.createResult(score, 100, evidence, { keyBrandAttributes, keywordMatches }, issues);
    }

    const matchedCount = keywordMatches.length;
    const totalKeywords = keyBrandAttributes.length;
    const matchPercentage = (matchedCount / totalKeywords) * 100;

    // Find missing keywords
    const missingKeywords = keyBrandAttributes.filter(
      keyword => !keywordMatches.includes(keyword)
    );

    if (matchPercentage === 0) {
      score = 20;
      issues.push(this.generateIssue(
        'critical',
        'None of the key brand attributes found in content',
        `Include these brand keywords: ${missingKeywords.join(', ')}`
      ));
      evidence.push(`No brand keywords matched. Looking for: ${keyBrandAttributes.join(', ')}`);
    } else if (matchPercentage >= 80) {
      score = 100;
      evidence.push(`Excellent keyword alignment: ${matchedCount}/${totalKeywords} keywords found`);
      if (missingKeywords.length > 0) {
        evidence.push(`Missing only: ${missingKeywords.join(', ')}`);
      }
    } else if (matchPercentage >= 60) {
      score = 85;
      evidence.push(`Good keyword alignment: ${matchedCount}/${totalKeywords} keywords found`);
      issues.push(this.generateIssue(
        'low',
        `Some brand keywords missing: ${missingKeywords.join(', ')}`,
        'Consider incorporating missing keywords where relevant'
      ));
    } else if (matchPercentage >= 40) {
      score = 70;
      evidence.push(`Fair keyword alignment: ${matchedCount}/${totalKeywords} keywords found`);
      issues.push(this.generateIssue(
        'medium',
        `Many brand keywords missing: ${missingKeywords.join(', ')}`,
        'Improve content alignment with brand messaging'
      ));
    } else {
      score = 50;
      evidence.push(`Poor keyword alignment: ${matchedCount}/${totalKeywords} keywords found`);
      issues.push(this.generateIssue(
        'high',
        `Most brand keywords missing: ${missingKeywords.join(', ')}`,
        'Significantly improve content alignment with brand attributes'
      ));
    }

    // List found keywords as evidence
    if (keywordMatches.length > 0) {
      evidence.push(`Found keywords: ${keywordMatches.join(', ')}`);
    }
    
    // Always show what keywords we're looking for
    evidence.push(`Keywords searched for: ${keyBrandAttributes.join(', ')}`);

    return this.createResult(
      score,
      100,
      evidence,
      { 
        keyBrandAttributes, 
        keywordMatches, 
        missingKeywords,
        matchPercentage,
        matchedCount,
        totalKeywords
      },
      issues
    );
  }
}