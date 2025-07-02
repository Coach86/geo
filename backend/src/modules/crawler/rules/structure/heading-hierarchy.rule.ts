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
  weight = 0.25;

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
      evidence.push(`Single H1 heading present: "${h1Text}" (+50 points)`);
    } else {
      score += 25;
      issues.push(this.generateIssue(
        'medium',
        `Multiple H1 headings found (${h1Count})`,
        'Use only one H1 per page; use H2-H6 for subsections'
      ));
      evidence.push(`${h1Count} H1 headings found. First H1: "${h1Text}" (+25 points)`);
    }

    // Check heading hierarchy and analyze specific issues
    const hierarchyIssues = this.analyzeHierarchyIssues(headingHierarchy);
    
    if (hierarchyScore >= 80) {
      score += 50;
      evidence.push(`Excellent heading hierarchy (score: ${hierarchyScore}/100) (+50 points)`);
    } else if (hierarchyScore >= 60) {
      score += 35;
      evidence.push(`Good heading hierarchy (score: ${hierarchyScore}/100) (+35 points)`);
      // Only add issue if there are actual problems detected
      if (hierarchyIssues.length > 0) {
        evidence.push(`Issues found: ${hierarchyIssues.join(', ')}`);
        issues.push(this.generateIssue(
          'low',
          `Heading hierarchy could be improved: ${hierarchyIssues.join(', ')}`,
          'Address the specific issues mentioned to improve heading structure'
        ));
      }
    } else if (hierarchyScore >= 40) {
      score += 20;
      evidence.push(`Fair heading hierarchy (score: ${hierarchyScore}/100) (+20 points)`);
      if (hierarchyIssues.length > 0) {
        evidence.push(`Issues found: ${hierarchyIssues.join(', ')}`);
      }
      const issueDetails = hierarchyIssues.length > 0 ? `: ${hierarchyIssues.join(', ')}` : '';
      issues.push(this.generateIssue(
        'medium',
        `Heading hierarchy has issues${issueDetails}`,
        'Review heading structure to ensure proper nesting and no skipped levels'
      ));
    } else {
      score += 10;
      evidence.push(`Poor heading hierarchy (score: ${hierarchyScore}/100) (+10 points)`);
      if (hierarchyIssues.length > 0) {
        evidence.push(`Issues found: ${hierarchyIssues.join(', ')}`);
      }
      const issueDetails = hierarchyIssues.length > 0 ? `: ${hierarchyIssues.join(', ')}` : '';
      issues.push(this.generateIssue(
        'high',
        `Heading hierarchy is poorly structured${issueDetails}`,
        'Restructure headings to follow semantic order without skipping levels'
      ));
    }

    // Always add heading hierarchy details to evidence if any headings exist
    if (headingHierarchy && headingHierarchy.length > 0) {
      evidence.push('Heading structure:');
      headingHierarchy.forEach(heading => {
        evidence.push(`  ${heading}`);
      });
    } else {
      // Explicitly note when no headings are found
      evidence.push('Heading structure: No headings found on the page');
    }

    return this.createResult(
      Math.min(100, score),
      100,
      evidence,
      { h1Count, hierarchyScore, h1Text, headingHierarchy },
      issues
    );
  }
  
  /**
   * Analyze heading hierarchy to find specific issues
   */
  private analyzeHierarchyIssues(headingHierarchy: string[] | undefined): string[] {
    if (!headingHierarchy || headingHierarchy.length === 0) {
      return ['no headings found'];
    }
    
    const issues: string[] = [];
    let previousLevel = 0;
    let h2BeforeH1 = false;
    let hasSkippedLevels = false;
    
    // Parse heading levels from the hierarchy
    for (const heading of headingHierarchy) {
      const match = heading.match(/^h(\d):/);
      if (match) {
        const level = parseInt(match[1]);
        
        // Check if H2 comes before H1
        if (level === 2 && previousLevel === 0) {
          h2BeforeH1 = true;
        }
        
        // Check for skipped levels (e.g., H1 -> H3)
        if (previousLevel > 0 && level > previousLevel + 1) {
          hasSkippedLevels = true;
        }
        
        if (level === 1 && previousLevel > 0) {
          previousLevel = 1; // Reset when we hit an H1
        } else if (level <= 6) {
          previousLevel = level;
        }
      }
    }
    
    // Count headings by level
    const headingCounts: Record<number, number> = {};
    for (const heading of headingHierarchy) {
      const match = heading.match(/^h(\d):/);
      if (match) {
        const level = parseInt(match[1]);
        headingCounts[level] = (headingCounts[level] || 0) + 1;
      }
    }
    
    // Identify specific issues
    if (h2BeforeH1) {
      issues.push('H2 appears before H1');
    }
    
    if (hasSkippedLevels) {
      issues.push('skipped heading levels detected');
    }
    
    // Check for too many H2s relative to content
    if (headingCounts[2] && headingCounts[2] > 10) {
      issues.push(`many H2 headings (${headingCounts[2]}) may indicate over-segmentation`);
    }
    
    // Check for deep nesting
    if (headingCounts[5] || headingCounts[6]) {
      issues.push('very deep heading nesting (H5/H6) may be hard to follow');
    }
    
    return issues;
  }
}