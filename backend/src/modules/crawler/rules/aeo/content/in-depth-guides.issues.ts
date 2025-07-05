import { RuleIssue } from '../../../interfaces/rule.interface';

export enum InDepthGuidesIssueId {
  NOT_A_GUIDE = 'in-depth-guides-not-a-guide',
  INSUFFICIENT_WORD_COUNT = 'in-depth-guides-insufficient-words',
  LOW_WORD_COUNT = 'in-depth-guides-low-words',
  NO_TABLE_OF_CONTENTS = 'in-depth-guides-no-toc',
  INSUFFICIENT_COMPREHENSIVENESS = 'in-depth-guides-insufficient-depth',
  BASIC_COMPREHENSIVENESS = 'in-depth-guides-basic-depth',
  NO_EXAMPLES = 'in-depth-guides-no-examples',
  NO_INTERNAL_LINKS = 'in-depth-guides-no-internal-links',
  NO_EXTERNAL_REFERENCES = 'in-depth-guides-no-external-refs',
  SURFACE_LEVEL_TOPICS = 'in-depth-guides-surface-topics',
  OUTDATED_CONTENT = 'in-depth-guides-outdated',
  INSUFFICIENT_TOPICS = 'in-depth-guides-few-topics',
}

export const IN_DEPTH_GUIDES_ISSUES: Record<InDepthGuidesIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [InDepthGuidesIssueId.NOT_A_GUIDE]: {
    severity: 'critical',
    description: 'Content is not structured as an in-depth guide',
    recommendation: 'Transform content into a comprehensive guide with clear structure, multiple sections, and detailed coverage',
  },
  
  [InDepthGuidesIssueId.INSUFFICIENT_WORD_COUNT]: {
    severity: 'high',
    description: 'Guide has insufficient content length',
    recommendation: 'Expand guide to at least 2,000 words for good score, 3,000+ words for excellent score',
  },
  
  [InDepthGuidesIssueId.LOW_WORD_COUNT]: {
    severity: 'medium',
    description: 'Guide content could be more comprehensive',
    recommendation: 'Expand guide to 3,000+ words for excellent comprehensiveness',
  },
  
  [InDepthGuidesIssueId.NO_TABLE_OF_CONTENTS]: {
    severity: 'medium',
    description: 'Missing table of contents or navigation',
    recommendation: 'Add a table of contents with jump links to major sections',
  },
  
  [InDepthGuidesIssueId.INSUFFICIENT_COMPREHENSIVENESS]: {
    severity: 'high',
    description: 'Guide lacks depth and completeness',
    recommendation: 'Add more detailed coverage of subtopics, examples, and practical applications',
  },
  
  [InDepthGuidesIssueId.BASIC_COMPREHENSIVENESS]: {
    severity: 'medium',
    description: 'Guide has basic coverage but could be more thorough',
    recommendation: 'Expand coverage to include more subtopics, edge cases, and advanced concepts',
  },
  
  [InDepthGuidesIssueId.NO_EXAMPLES]: {
    severity: 'medium',
    description: 'No practical examples or case studies found',
    recommendation: 'Add real-world examples, case studies, or practical demonstrations',
  },
  
  [InDepthGuidesIssueId.NO_INTERNAL_LINKS]: {
    severity: 'low',
    description: 'No internal links to related content',
    recommendation: 'Add links to related guides, articles, and resources on your site',
  },
  
  [InDepthGuidesIssueId.NO_EXTERNAL_REFERENCES]: {
    severity: 'low',
    description: 'No external authoritative references',
    recommendation: 'Cite external authoritative sources to support claims and add credibility',
  },
  
  [InDepthGuidesIssueId.SURFACE_LEVEL_TOPICS]: {
    severity: 'high',
    description: 'Topics are covered at surface level only',
    recommendation: 'Provide comprehensive coverage with detailed explanations for each topic',
  },
  
  [InDepthGuidesIssueId.OUTDATED_CONTENT]: {
    severity: 'high',
    description: 'Guide content appears outdated',
    recommendation: 'Update guide with current information and add last updated date',
  },
  
  [InDepthGuidesIssueId.INSUFFICIENT_TOPICS]: {
    severity: 'medium',
    description: 'Too few topics covered for comprehensive guide',
    recommendation: 'Cover at least 5-10 major topics or subtopics for thorough coverage',
  },
};

export function createInDepthGuidesIssue(
  issueId: InDepthGuidesIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = IN_DEPTH_GUIDES_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}