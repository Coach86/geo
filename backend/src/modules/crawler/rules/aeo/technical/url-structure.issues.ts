import { RuleIssue } from '../../../interfaces/rule.interface';

export enum UrlStructureIssueId {
  URL_TOO_LONG = 'url-structure-too-long',
  URL_LENGTHY = 'url-structure-lengthy',
  NO_HTTPS = 'url-structure-no-https',
  NOT_DESCRIPTIVE = 'url-structure-not-descriptive',
  UNENCODED_SPACES = 'url-structure-unencoded-spaces',
  USES_UNDERSCORES = 'url-structure-underscores',
  CONTAINS_UPPERCASE = 'url-structure-uppercase',
  SPECIAL_CHARACTERS = 'url-structure-special-chars',
  DOUBLE_SLASHES = 'url-structure-double-slashes',
  TOO_MANY_PARAMETERS = 'url-structure-too-many-params',
  HAS_FILE_EXTENSION = 'url-structure-file-extension',
  HIERARCHY_TOO_DEEP = 'url-structure-hierarchy-deep',
  ILLOGICAL_HIERARCHY = 'url-structure-illogical-hierarchy',
  KEYWORD_STUFFING = 'url-structure-keyword-stuffing',
  GENERIC_TERMS = 'url-structure-generic-terms',
}

export const URL_STRUCTURE_ISSUES: Record<UrlStructureIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [UrlStructureIssueId.URL_TOO_LONG]: {
    severity: 'high',
    description: 'URL exceeds 200 characters',
    recommendation: 'Keep URLs under 200 characters for better usability and SEO',
  },
  
  [UrlStructureIssueId.URL_LENGTHY]: {
    severity: 'medium',
    description: 'URL is lengthy (over 100 characters)',
    recommendation: 'Consider shortening URL to under 100 characters for optimal usability',
  },
  
  [UrlStructureIssueId.NO_HTTPS]: {
    severity: 'critical',
    description: 'Not using HTTPS protocol',
    recommendation: 'Switch to HTTPS for security and SEO benefits',
  },
  
  [UrlStructureIssueId.NOT_DESCRIPTIVE]: {
    severity: 'medium',
    description: 'URL lacks descriptive keywords',
    recommendation: 'Use descriptive words separated by hyphens to improve readability and SEO',
  },
  
  [UrlStructureIssueId.UNENCODED_SPACES]: {
    severity: 'high',
    description: 'URL contains unencoded spaces',
    recommendation: 'Replace spaces with hyphens or encode them as %20',
  },
  
  [UrlStructureIssueId.USES_UNDERSCORES]: {
    severity: 'low',
    description: 'URL uses underscores instead of hyphens',
    recommendation: 'Use hyphens instead of underscores for better SEO',
  },
  
  [UrlStructureIssueId.CONTAINS_UPPERCASE]: {
    severity: 'low',
    description: 'URL contains uppercase letters',
    recommendation: 'Use lowercase letters only in URLs for consistency',
  },
  
  [UrlStructureIssueId.SPECIAL_CHARACTERS]: {
    severity: 'high',
    description: 'URL contains problematic special characters',
    recommendation: 'Remove special characters and use only alphanumeric characters and hyphens',
  },
  
  [UrlStructureIssueId.DOUBLE_SLASHES]: {
    severity: 'medium',
    description: 'URL contains double slashes',
    recommendation: 'Remove duplicate slashes for cleaner URL structure',
  },
  
  [UrlStructureIssueId.TOO_MANY_PARAMETERS]: {
    severity: 'medium',
    description: 'URL contains excessive parameters',
    recommendation: 'Consider using clean URLs with path segments instead of query parameters',
  },
  
  [UrlStructureIssueId.HAS_FILE_EXTENSION]: {
    severity: 'low',
    description: 'URL includes file extension',
    recommendation: 'Use extension-less URLs for cleaner, more flexible URLs',
  },
  
  [UrlStructureIssueId.HIERARCHY_TOO_DEEP]: {
    severity: 'medium',
    description: 'URL hierarchy is too deep',
    recommendation: 'Limit URL depth to 3-4 levels for better user experience and crawlability',
  },
  
  [UrlStructureIssueId.ILLOGICAL_HIERARCHY]: {
    severity: 'medium',
    description: 'URL hierarchy seems illogical',
    recommendation: 'Structure URLs to reflect logical parent-child relationships',
  },
  
  [UrlStructureIssueId.KEYWORD_STUFFING]: {
    severity: 'high',
    description: 'URL shows signs of keyword stuffing',
    recommendation: 'Avoid keyword repetition in URL structure',
  },
  
  [UrlStructureIssueId.GENERIC_TERMS]: {
    severity: 'low',
    description: 'URL contains generic terms',
    recommendation: 'Replace generic terms like "page", "item" with descriptive keywords',
  },
};

export function createUrlStructureIssue(
  issueId: UrlStructureIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = URL_STRUCTURE_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}