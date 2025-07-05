import { RuleIssue } from '../../../interfaces/rule.interface';

export enum CleanHtmlStructureIssueId {
  MISSING_DOCTYPE = 'clean-html-missing-doctype',
  DEPRECATED_TAGS = 'clean-html-deprecated-tags',
  NO_SEMANTIC_TAGS = 'clean-html-no-semantic-tags',
  MISSING_LANG_ATTRIBUTE = 'clean-html-missing-lang',
  EXCESSIVE_INLINE_STYLES = 'clean-html-excessive-inline-styles',
  CRITICAL_VALIDATION_ERRORS = 'clean-html-critical-validation-errors',
  HIGH_VALIDATION_ERRORS = 'clean-html-high-validation-errors',
  LOW_CONTENT_RATIO = 'clean-html-low-content-ratio',
  EXCESSIVE_DIV_USAGE = 'clean-html-excessive-divs',
}

export const CLEAN_HTML_STRUCTURE_ISSUES: Record<CleanHtmlStructureIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [CleanHtmlStructureIssueId.MISSING_DOCTYPE]: {
    severity: 'critical',
    description: 'Missing <!DOCTYPE html> declaration',
    recommendation: 'Add <!DOCTYPE html> at the beginning of the HTML document',
  },
  
  [CleanHtmlStructureIssueId.DEPRECATED_TAGS]: {
    severity: 'high',
    description: 'Using deprecated HTML tags',
    recommendation: 'Replace deprecated tags with modern HTML5 equivalents',
  },
  
  [CleanHtmlStructureIssueId.NO_SEMANTIC_TAGS]: {
    severity: 'medium',
    description: 'Missing semantic HTML5 tags',
    recommendation: 'Use semantic tags like <header>, <nav>, <main>, <article>, <section>, <footer> for better structure',
  },
  
  [CleanHtmlStructureIssueId.MISSING_LANG_ATTRIBUTE]: {
    severity: 'high',
    description: 'HTML tag missing lang attribute',
    recommendation: 'Add lang attribute to HTML tag for accessibility and SEO',
  },
  
  [CleanHtmlStructureIssueId.EXCESSIVE_INLINE_STYLES]: {
    severity: 'low',
    description: 'Excessive inline styles found',
    recommendation: 'Move inline styles to external CSS files for maintainability',
  },
  
  [CleanHtmlStructureIssueId.CRITICAL_VALIDATION_ERRORS]: {
    severity: 'critical',
    description: 'Critical HTML validation errors',
    recommendation: 'Fix HTML validation errors using W3C validator',
  },
  
  [CleanHtmlStructureIssueId.HIGH_VALIDATION_ERRORS]: {
    severity: 'high',
    description: 'High number of HTML validation errors',
    recommendation: 'Reduce HTML validation errors to less than 5 per 100 lines',
  },
  
  [CleanHtmlStructureIssueId.LOW_CONTENT_RATIO]: {
    severity: 'high',
    description: 'Low content ratio - content may be loaded via JavaScript',
    recommendation: 'Ensure critical content is present in raw HTML for better SEO',
  },
  
  [CleanHtmlStructureIssueId.EXCESSIVE_DIV_USAGE]: {
    severity: 'medium',
    description: 'Excessive div usage detected (divitis)',
    recommendation: 'Replace generic divs with semantic HTML tags for better structure',
  },
};

export function createCleanHtmlStructureIssue(
  issueId: CleanHtmlStructureIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = CLEAN_HTML_STRUCTURE_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}