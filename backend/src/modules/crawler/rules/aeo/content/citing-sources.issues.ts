import { RuleIssue } from '../../../interfaces/rule.interface';

export enum CitingSourcesIssueId {
  NO_CITATIONS_FOUND = 'citing-sources-no-citations',
  LOW_CITATION_DENSITY = 'citing-sources-low-density',
  INSUFFICIENT_CITATION_DENSITY = 'citing-sources-insufficient-density',
  NO_REPUTABLE_SOURCES = 'citing-sources-no-reputable',
  FEW_REPUTABLE_SOURCES = 'citing-sources-few-reputable',
  OUTDATED_SOURCES = 'citing-sources-outdated',
  NO_RECENT_SOURCES = 'citing-sources-no-recent',
  INFORMAL_CITATION_STYLE = 'citing-sources-informal-style',
  NO_REFERENCES_SECTION = 'citing-sources-no-references-section',
  WEAK_CONTEXTUAL_RELEVANCE = 'citing-sources-weak-relevance',
}

export const CITING_SOURCES_ISSUES: Record<CitingSourcesIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [CitingSourcesIssueId.NO_CITATIONS_FOUND]: {
    severity: 'critical',
    description: 'No citations or references found in content',
    recommendation: 'Add citations from reputable sources to support claims and build authority',
  },
  
  [CitingSourcesIssueId.LOW_CITATION_DENSITY]: {
    severity: 'high',
    description: 'Citation density is too low',
    recommendation: 'Add more citations (aim for 1 citation per 500-1000 words)',
  },
  
  [CitingSourcesIssueId.INSUFFICIENT_CITATION_DENSITY]: {
    severity: 'medium',
    description: 'Citation density could be improved',
    recommendation: 'Increase citation frequency to 1 per 500 words for excellent score',
  },
  
  [CitingSourcesIssueId.NO_REPUTABLE_SOURCES]: {
    severity: 'high',
    description: 'No citations from reputable sources (.gov, .edu, peer-reviewed)',
    recommendation: 'Include citations from government, educational, or peer-reviewed sources',
  },
  
  [CitingSourcesIssueId.FEW_REPUTABLE_SOURCES]: {
    severity: 'medium',
    description: 'Too few reputable sources cited',
    recommendation: 'Add more citations from .gov, .edu, or peer-reviewed sources (5+ for excellent)',
  },
  
  [CitingSourcesIssueId.OUTDATED_SOURCES]: {
    severity: 'medium',
    description: 'Many sources are outdated',
    recommendation: 'Update citations to include sources from the last 2 years',
  },
  
  [CitingSourcesIssueId.NO_RECENT_SOURCES]: {
    severity: 'low',
    description: 'No recent sources cited',
    recommendation: 'Include some citations from the last 24 months to show current relevance',
  },
  
  [CitingSourcesIssueId.INFORMAL_CITATION_STYLE]: {
    severity: 'low',
    description: 'Citation style is too informal',
    recommendation: 'Use more formal citation methods (author, date, publication)',
  },
  
  [CitingSourcesIssueId.NO_REFERENCES_SECTION]: {
    severity: 'medium',
    description: 'No dedicated references or bibliography section',
    recommendation: 'Add a formal references section at the end of the content',
  },
  
  [CitingSourcesIssueId.WEAK_CONTEXTUAL_RELEVANCE]: {
    severity: 'medium',
    description: 'Citations have weak relevance to claims',
    recommendation: 'Ensure citations directly support the specific claims being made',
  },
};

export function createCitingSourcesIssue(
  issueId: CitingSourcesIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = CITING_SOURCES_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}