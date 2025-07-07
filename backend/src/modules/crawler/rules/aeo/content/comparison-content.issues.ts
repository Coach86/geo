import { RuleIssue } from '../../../interfaces/rule.interface';

export enum ComparisonContentIssueId {
  NO_COMPARISONS_FOUND = 'comparison-content-no-comparisons',
  FEW_COMPARISON_ITEMS = 'comparison-content-few-items',
  NO_STRUCTURED_FORMAT = 'comparison-content-no-structure',
  SURFACE_LEVEL_COMPARISON = 'comparison-content-surface-level',
  BIASED_COMPARISON = 'comparison-content-biased',
  NO_PROS_CONS = 'comparison-content-no-pros-cons',
  NO_COMPARISON_TABLE = 'comparison-content-no-table',
  NO_INTERNAL_LINKS = 'comparison-content-no-internal-links',
  NO_SCHEMA_MARKUP = 'comparison-content-no-schema',
  OUTDATED_COMPARISON = 'comparison-content-outdated',
}

export const COMPARISON_CONTENT_ISSUES: Record<ComparisonContentIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [ComparisonContentIssueId.NO_COMPARISONS_FOUND]: {
    severity: 'critical',
    description: 'No comparison content found on the page',
    recommendation: 'Add comparison tables, pros/cons lists, or detailed feature comparisons',
  },
  
  [ComparisonContentIssueId.FEW_COMPARISON_ITEMS]: {
    severity: 'medium',
    description: 'Too few items being compared',
    recommendation: 'Include at least 3-5 alternatives or competitors for comprehensive comparison',
  },
  
  [ComparisonContentIssueId.NO_STRUCTURED_FORMAT]: {
    severity: 'high',
    description: 'Comparison lacks structured format',
    recommendation: 'Add comparison tables, bullet points, or structured lists for better readability',
  },
  
  [ComparisonContentIssueId.SURFACE_LEVEL_COMPARISON]: {
    severity: 'medium',
    description: 'Comparison is too superficial',
    recommendation: 'Add more detailed analysis, specific features, pricing, and use cases',
  },
  
  [ComparisonContentIssueId.BIASED_COMPARISON]: {
    severity: 'high',
    description: 'Comparison appears biased or one-sided',
    recommendation: 'Provide balanced coverage of pros and cons for all compared items',
  },
  
  [ComparisonContentIssueId.NO_PROS_CONS]: {
    severity: 'medium',
    description: 'Missing pros and cons analysis',
    recommendation: 'Add clear pros/cons or advantages/disadvantages for each compared item',
  },
  
  [ComparisonContentIssueId.NO_COMPARISON_TABLE]: {
    severity: 'low',
    description: 'No comparison table found',
    recommendation: 'Add a comparison table for easy side-by-side evaluation',
  },
  
  [ComparisonContentIssueId.NO_INTERNAL_LINKS]: {
    severity: 'low',
    description: 'No internal links to alternatives',
    recommendation: 'Add links to detailed pages about each compared item',
  },
  
  [ComparisonContentIssueId.NO_SCHEMA_MARKUP]: {
    severity: 'medium',
    description: 'Missing structured data markup for comparisons',
    recommendation: 'Add ItemList or Product schema markup for better AI understanding',
  },
  
  [ComparisonContentIssueId.OUTDATED_COMPARISON]: {
    severity: 'high',
    description: 'Comparison content appears outdated',
    recommendation: 'Update comparison with current information and add last updated date',
  },
};

export function createComparisonContentIssue(
  issueId: ComparisonContentIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = COMPARISON_CONTENT_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}