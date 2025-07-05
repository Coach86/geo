import { RuleIssue } from '../../../interfaces/rule.interface';

export enum MetaDescriptionIssueId {
  NO_META_DESCRIPTION = 'meta-description-missing',
  TOO_SHORT = 'meta-description-too-short',
  TOO_LONG = 'meta-description-too-long',
  KEYWORD_STUFFING = 'meta-description-keyword-stuffing',
  LACKS_COMPELLING = 'meta-description-lacks-compelling',
  DUPLICATES_TITLE = 'meta-description-duplicates-title',
  DUPLICATES_H1 = 'meta-description-duplicates-h1',
}

export const META_DESCRIPTION_ISSUES: Record<MetaDescriptionIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [MetaDescriptionIssueId.NO_META_DESCRIPTION]: {
    severity: 'critical',
    description: 'No meta description tag found',
    recommendation: 'Add a unique meta description of 150-160 characters that summarizes the page content and includes relevant keywords',
  },
  
  [MetaDescriptionIssueId.TOO_SHORT]: {
    severity: 'high',
    description: 'Meta description too short',
    recommendation: 'Expand meta description to 150-160 characters for optimal SERP display',
  },
  
  [MetaDescriptionIssueId.TOO_LONG]: {
    severity: 'medium',
    description: 'Meta description too long',
    recommendation: 'Shorten meta description to 150-160 characters to avoid truncation in search results',
  },
  
  [MetaDescriptionIssueId.KEYWORD_STUFFING]: {
    severity: 'high',
    description: 'Meta description shows keyword stuffing',
    recommendation: 'Reduce keyword repetition and write naturally for users',
  },
  
  [MetaDescriptionIssueId.LACKS_COMPELLING]: {
    severity: 'medium',
    description: 'Meta description lacks compelling language or call-to-action',
    recommendation: 'Add action words, value propositions, or clear benefits to encourage clicks',
  },
  
  [MetaDescriptionIssueId.DUPLICATES_TITLE]: {
    severity: 'high',
    description: 'Meta description duplicates title tag',
    recommendation: 'Write a unique meta description that complements but doesn\'t duplicate the title',
  },
  
  [MetaDescriptionIssueId.DUPLICATES_H1]: {
    severity: 'high',
    description: 'Meta description duplicates H1 tag',
    recommendation: 'Write a unique meta description that complements but doesn\'t duplicate the H1',
  },
};

export function createMetaDescriptionIssue(
  issueId: MetaDescriptionIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = META_DESCRIPTION_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}