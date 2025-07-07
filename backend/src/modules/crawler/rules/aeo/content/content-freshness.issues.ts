import { RuleIssue } from '../../../interfaces/rule.interface';

export enum ContentFreshnessIssueId {
  NO_DATE_INFORMATION = 'content-freshness-no-date',
  CONTENT_OVER_YEAR_OLD = 'content-freshness-over-year-old',
  CONTENT_OVER_SIX_MONTHS = 'content-freshness-over-six-months',
  NO_VISIBLE_DATES = 'content-freshness-no-visible-dates',
  NO_RECENT_YEAR_REFS = 'content-freshness-no-recent-years',
  NO_FRESHNESS_INDICATORS = 'content-freshness-no-indicators',
}

export const CONTENT_FRESHNESS_ISSUES: Record<ContentFreshnessIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [ContentFreshnessIssueId.NO_DATE_INFORMATION]: {
    severity: 'high',
    description: 'No date information found in URL or metadata',
    recommendation: 'Add publication or last modified date metadata, or include dates in URLs for time-sensitive content',
  },
  
  [ContentFreshnessIssueId.CONTENT_OVER_YEAR_OLD]: {
    severity: 'medium',
    description: 'Content is over 1 year old',
    recommendation: 'Update content regularly or clearly indicate when content was last reviewed',
  },
  
  [ContentFreshnessIssueId.CONTENT_OVER_SIX_MONTHS]: {
    severity: 'low',
    description: 'Content is over 6 months old',
    recommendation: 'Consider updating content to maintain freshness signals',
  },
  
  [ContentFreshnessIssueId.NO_VISIBLE_DATES]: {
    severity: 'medium',
    description: 'No visible dates found in content',
    recommendation: 'Display publication or update dates visibly in the content',
  },
  
  [ContentFreshnessIssueId.NO_RECENT_YEAR_REFS]: {
    severity: 'low',
    description: 'No recent year references found',
    recommendation: 'Include current year references where relevant to show content is up-to-date',
  },
  
  [ContentFreshnessIssueId.NO_FRESHNESS_INDICATORS]: {
    severity: 'low',
    description: 'No freshness indicators found',
    recommendation: 'Use words like "latest", "updated", "current" to signal content freshness',
  },
};

export function createContentFreshnessIssue(
  issueId: ContentFreshnessIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = CONTENT_FRESHNESS_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}