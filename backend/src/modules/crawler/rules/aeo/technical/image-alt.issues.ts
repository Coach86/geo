import { RuleIssue } from '../../../interfaces/rule.interface';

export enum ImageAltIssueId {
  MISSING_ALT_CRITICAL = 'image-alt-missing-critical',
  MISSING_ALT_HIGH = 'image-alt-missing-high',
  MISSING_ALT_MEDIUM = 'image-alt-missing-medium',
  EMPTY_ALT_EXCESSIVE = 'image-alt-empty-excessive',
  GENERIC_ALT_TEXT = 'image-alt-generic-text',
  LOW_DESCRIPTIVE_CRITICAL = 'image-alt-low-descriptive-critical',
  LOW_DESCRIPTIVE_HIGH = 'image-alt-low-descriptive-high',
}

export const IMAGE_ALT_ISSUES: Record<ImageAltIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [ImageAltIssueId.MISSING_ALT_CRITICAL]: {
    severity: 'critical',
    description: 'Majority of images missing alt attributes',
    recommendation: 'Add descriptive alt text to all images for accessibility and SEO',
  },
  
  [ImageAltIssueId.MISSING_ALT_HIGH]: {
    severity: 'high',
    description: 'Several images missing alt attributes',
    recommendation: 'Add alt text to remaining images to improve accessibility',
  },
  
  [ImageAltIssueId.MISSING_ALT_MEDIUM]: {
    severity: 'medium',
    description: 'Some images missing alt attributes',
    recommendation: 'Complete alt text coverage for full accessibility compliance',
  },
  
  [ImageAltIssueId.EMPTY_ALT_EXCESSIVE]: {
    severity: 'medium',
    description: 'Many images have empty alt attributes',
    recommendation: 'Add descriptive text to empty alt attributes unless images are purely decorative',
  },
  
  [ImageAltIssueId.GENERIC_ALT_TEXT]: {
    severity: 'low',
    description: 'Images use generic alt text',
    recommendation: 'Replace generic alt text like "image", "photo" with descriptive alternatives',
  },
  
  [ImageAltIssueId.LOW_DESCRIPTIVE_CRITICAL]: {
    severity: 'critical',
    description: 'Very few images have descriptive alt text',
    recommendation: 'Improve alt text quality - aim for at least 4 words per alt text',
  },
  
  [ImageAltIssueId.LOW_DESCRIPTIVE_HIGH]: {
    severity: 'high',
    description: 'Low percentage of images have descriptive alt text',
    recommendation: 'Enhance alt text descriptions to improve accessibility and SEO',
  },
};

export function createImageAltIssue(
  issueId: ImageAltIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = IMAGE_ALT_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}