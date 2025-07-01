import { Injectable } from '@nestjs/common';
import { BaseBrandRule } from './base-brand.rule';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';
import { PAGE_CATEGORIES } from '../constants/page-categories';

@Injectable()
export class BrandPresenceRule extends BaseBrandRule {
  id = 'brand-presence';
  name = 'Brand Presence';
  description = 'Evaluates brand name mentions and visibility';
  applicability = { scope: 'all' as const };
  priority = 10;
  weight = 0.4;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { pageSignals, projectContext, pageCategory } = context;
    const brandMentions = pageSignals.brand.brandMentionCount;
    const brandName = projectContext.brandName;
    
    const issues = [];
    const evidence = [];
    let score = 0;

    // Different expectations based on page type
    const isHomepage = pageCategory.type === PAGE_CATEGORIES.HOMEPAGE;
    const isAboutCompany = pageCategory.type === PAGE_CATEGORIES.ABOUT_COMPANY;
    const isBrandCritical = isHomepage || isAboutCompany;

    if (brandMentions === 0) {
      if (isBrandCritical) {
        score = 0;
        issues.push(this.generateIssue(
          'critical',
          `Brand name "${brandName}" not found on ${pageCategory.type}`,
          'Ensure brand name is prominently displayed on key pages'
        ));
      } else {
        score = 30;
        issues.push(this.generateIssue(
          'high',
          `Brand name "${brandName}" not mentioned`,
          'Include brand name at least once for consistency'
        ));
      }
      evidence.push(`No mentions of brand name "${brandName}" found on page`);
    } else if (brandMentions === 1) {
      if (isBrandCritical) {
        score = 60;
        issues.push(this.generateIssue(
          'medium',
          'Brand mentioned only once on key page',
          'Increase brand visibility on homepage and company pages'
        ));
      } else {
        score = 80;
      }
      evidence.push(`Brand "${brandName}" mentioned 1 time`);
    } else if (brandMentions >= 2 && brandMentions <= 5) {
      score = 100;
      evidence.push(`Optimal brand presence: "${brandName}" mentioned ${brandMentions} times`);
    } else if (brandMentions >= 6 && brandMentions <= 10) {
      score = 85;
      evidence.push(`Good brand presence: "${brandName}" mentioned ${brandMentions} times`);
      if (!isBrandCritical) {
        issues.push(this.generateIssue(
          'low',
          'Consider if brand mentions feel natural',
          'Ensure brand mentions don\'t feel forced or repetitive'
        ));
      }
    } else {
      score = 70;
      evidence.push(`High brand presence: "${brandName}" mentioned ${brandMentions} times`);
      issues.push(this.generateIssue(
        'medium',
        'Excessive brand mentions may seem unnatural',
        'Reduce brand name repetition for better readability'
      ));
    }

    return this.createResult(
      score,
      100,
      evidence,
      { brandMentions, brandName, isBrandCritical },
      issues
    );
  }
}