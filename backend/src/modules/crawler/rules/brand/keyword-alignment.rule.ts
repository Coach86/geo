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

    // Score based on match percentage
    if (matchPercentage >= 80) {
      score = 100;
      evidence.push(`Excellent keyword alignment: ${matchedCount}/${totalKeywords} keywords found`);
    } else if (matchPercentage >= 60) {
      score = 85;
      evidence.push(`Good keyword alignment: ${matchedCount}/${totalKeywords} keywords found`);
    } else if (matchPercentage >= 40) {
      score = 70;
      evidence.push(`Fair keyword alignment: ${matchedCount}/${totalKeywords} keywords found`);
    } else if (matchPercentage > 0) {
      score = 50;
      evidence.push(`Poor keyword alignment: ${matchedCount}/${totalKeywords} keywords found`);
    } else {
      // No matches at all
      score = 0;
      evidence.push(`No brand keywords found: 0/${totalKeywords} matched`);
    }

    // Add detailed keyword information
    evidence.push(`Keywords searched for: ${keyBrandAttributes.join(', ')}`);
    
    if (keywordMatches.length > 0) {
      evidence.push(`Found keywords: ${keywordMatches.join(', ')}`);
    }
    
    if (missingKeywords.length > 0 && missingKeywords.length < totalKeywords) {
      evidence.push(`Missing keywords: ${missingKeywords.join(', ')}`);
    }

    // Generate issues based on match percentage
    if (matchPercentage === 0) {
      issues.push(this.generateIssue(
        'critical',
        'None of the key brand attributes found in content',
        `Include these brand keywords naturally in your content: ${keyBrandAttributes.join(', ')}`
      ));
    } else if (matchPercentage < 40) {
      issues.push(this.generateIssue(
        'high',
        `Most brand keywords missing (${missingKeywords.length}/${totalKeywords})`,
        'Significantly improve content alignment with brand attributes'
      ));
    } else if (matchPercentage < 60) {
      issues.push(this.generateIssue(
        'medium',
        `Many brand keywords missing (${missingKeywords.length}/${totalKeywords})`,
        'Improve content alignment with brand messaging'
      ));
    } else if (matchPercentage < 80) {
      issues.push(this.generateIssue(
        'low',
        `Some brand keywords missing (${missingKeywords.length}/${totalKeywords})`,
        'Consider incorporating missing keywords where relevant'
      ));
    }

    return this.createResult(
      score,
      100,
      evidence,
      { 
        keyBrandAttributes, 
        keywordMatches, 
        missingKeywords,
        matchPercentage: Math.round(matchPercentage),
        matchedCount,
        totalKeywords
      },
      issues
    );
  }
}