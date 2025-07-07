import { RuleIssue } from '../../../interfaces/rule.interface';

export enum SubheadingsIssueId {
  NO_SUBHEADINGS = 'subheadings-missing',
  NO_H2_HEADINGS = 'subheadings-no-h2',
  TOO_FEW_SUBHEADINGS = 'subheadings-too-few',
  BROKEN_HIERARCHY = 'subheadings-broken-hierarchy',
  H4_WITHOUT_H3 = 'subheadings-h4-without-h3',
  POOR_DENSITY = 'subheadings-poor-density',
  NO_QUESTIONS = 'subheadings-no-questions',
}

export const SUBHEADINGS_ISSUES: Record<SubheadingsIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [SubheadingsIssueId.NO_SUBHEADINGS]: {
    severity: 'critical',
    description: 'No subheadings found in content',
    recommendation: 'Add H2-H6 headings to break up content and improve readability',
  },
  
  [SubheadingsIssueId.NO_H2_HEADINGS]: {
    severity: 'high',
    description: 'No H2 headings found',
    recommendation: 'Add H2 headings to structure your content into logical sections',
  },
  
  [SubheadingsIssueId.TOO_FEW_SUBHEADINGS]: {
    severity: 'medium',
    description: 'Too few subheadings for content length',
    recommendation: 'Add more subheadings to better structure long-form content',
  },
  
  [SubheadingsIssueId.BROKEN_HIERARCHY]: {
    severity: 'high',
    description: 'Heading hierarchy is broken (skipping levels)',
    recommendation: 'Fix heading structure - don\'t skip levels (e.g., H2 → H4 without H3)',
  },
  
  [SubheadingsIssueId.H4_WITHOUT_H3]: {
    severity: 'medium',
    description: 'Using H4 headings without H3',
    recommendation: 'Ensure proper hierarchy - use H3 before H4',
  },
  
  [SubheadingsIssueId.POOR_DENSITY]: {
    severity: 'medium',
    description: 'Content has too many words per subheading',
    recommendation: 'Add more subheadings - aim for one every 100-200 words',
  },
  
  [SubheadingsIssueId.NO_QUESTIONS]: {
    severity: 'low',
    description: 'No question-based headings found',
    recommendation: 'Consider using question formats in some headings to improve engagement',
  },
};

export function createSubheadingsIssue(
  issueId: SubheadingsIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = SUBHEADINGS_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}