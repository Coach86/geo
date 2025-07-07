import { RuleIssue } from '../../../interfaces/rule.interface';

export enum MainHeadingIssueId {
  NO_H1_TAG = 'main-heading-no-h1',
  MULTIPLE_H1_TAGS = 'main-heading-multiple-h1',
  H1_TOO_SHORT = 'main-heading-too-short',
  H1_TOO_LONG = 'main-heading-too-long',
  H1_GENERIC_TEXT = 'main-heading-generic-text',
  H1_MATCHES_TITLE = 'main-heading-matches-title',
  H1_UNRELATED_TO_TITLE = 'main-heading-unrelated-to-title',
}

export const MAIN_HEADING_ISSUES: Record<MainHeadingIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [MainHeadingIssueId.NO_H1_TAG]: {
    severity: 'critical',
    description: 'No H1 tag found on the page',
    recommendation: 'Add exactly one H1 tag with descriptive text (3-10 words)',
  },
  
  [MainHeadingIssueId.MULTIPLE_H1_TAGS]: {
    severity: 'high',
    description: 'Multiple H1 tags found',
    recommendation: 'Use exactly one H1 tag per page for clear content hierarchy',
  },
  
  [MainHeadingIssueId.H1_TOO_SHORT]: {
    severity: 'medium',
    description: 'H1 tag is too short',
    recommendation: 'Expand H1 to 3-10 words for better context',
  },
  
  [MainHeadingIssueId.H1_TOO_LONG]: {
    severity: 'low',
    description: 'H1 tag is too long',
    recommendation: 'Shorten H1 to 3-10 words for better readability',
  },
  
  [MainHeadingIssueId.H1_GENERIC_TEXT]: {
    severity: 'high',
    description: 'H1 uses generic or non-descriptive text',
    recommendation: 'Replace with specific, descriptive heading that summarizes page content',
  },
  
  [MainHeadingIssueId.H1_MATCHES_TITLE]: {
    severity: 'low',
    description: 'H1 exactly matches title tag',
    recommendation: 'Make H1 unique from title tag for better content differentiation',
  },
  
  [MainHeadingIssueId.H1_UNRELATED_TO_TITLE]: {
    severity: 'medium',
    description: 'H1 and title tag are completely unrelated',
    recommendation: 'Ensure H1 relates thematically to the title tag',
  },
};

export function createMainHeadingIssue(
  issueId: MainHeadingIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = MAIN_HEADING_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}