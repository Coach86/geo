import { Injectable } from '@nestjs/common';
import { BaseStructureRule } from './base-structure.rule';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';

@Injectable()
export class HeadingHierarchyRule extends BaseStructureRule {
  id = 'structure-heading-hierarchy';
  name = 'Heading Hierarchy';
  description = 'Evaluates proper heading structure and hierarchy';
  applicability = { scope: 'all' as const };
  priority = 10;
  weight = 0.4;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { pageSignals } = context;
    const h1Count = pageSignals.structure.h1Count;
    const hierarchyScore = pageSignals.structure.headingHierarchyScore;
    const headingHierarchy = pageSignals.structure.headingHierarchy;
    const h1Text = pageSignals.content.h1Text;
    
    const issues = [];
    const evidence = [];
    let score = 0;

    // Check H1 presence and count
    if (h1Count === 0) {
      score = 0;
      issues.push(this.generateIssue(
        'critical',
        'No H1 heading found on the page',
        'Add a single, descriptive H1 heading that summarizes the page content'
      ));
      evidence.push('Missing H1 heading');
    } else if (h1Count === 1) {
      score += 50;
      evidence.push(`Single H1 heading present: "${h1Text}"`);
    } else {
      score += 25;
      issues.push(this.generateIssue(
        'medium',
        `Multiple H1 headings found (${h1Count})`,
        'Use only one H1 per page; use H2-H6 for subsections'
      ));
      evidence.push(`${h1Count} H1 headings found. First H1: "${h1Text}"`);
    }

    // Check heading hierarchy
    if (hierarchyScore >= 80) {
      score += 50;
      evidence.push(`Excellent heading hierarchy (score: ${hierarchyScore}/100)`);
    } else if (hierarchyScore >= 60) {
      score += 35;
      evidence.push(`Good heading hierarchy (score: ${hierarchyScore}/100)`);
      issues.push(this.generateIssue(
        'low',
        'Heading hierarchy could be improved',
        'Ensure headings follow a logical order (H1→H2→H3) without skipping levels'
      ));
    } else if (hierarchyScore >= 40) {
      score += 20;
      evidence.push(`Fair heading hierarchy (score: ${hierarchyScore}/100)`);
      issues.push(this.generateIssue(
        'medium',
        'Heading hierarchy has issues',
        'Review heading structure to ensure proper nesting and no skipped levels'
      ));
    } else {
      score += 10;
      evidence.push(`Poor heading hierarchy (score: ${hierarchyScore}/100)`);
      issues.push(this.generateIssue(
        'high',
        'Heading hierarchy is poorly structured',
        'Restructure headings to follow semantic order without skipping levels'
      ));
    }

    // Add heading hierarchy details to evidence
    if (headingHierarchy && headingHierarchy.length > 0) {
      evidence.push('Heading structure:');
      headingHierarchy.forEach(heading => {
        evidence.push(`  ${heading}`);
      });
    }

    return this.createResult(
      Math.min(100, score),
      100,
      evidence,
      { h1Count, hierarchyScore, h1Text, headingHierarchy },
      issues
    );
  }
}