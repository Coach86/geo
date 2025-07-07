import { RuleIssue } from '../../../interfaces/rule.interface';

export enum StructuredDataIssueId {
  NO_STRUCTURED_DATA = 'structured-data-missing',
  VALIDATION_ERRORS = 'structured-data-validation-errors',
  MISSING_RECOMMENDED_TYPE = 'structured-data-missing-recommended-type',
  INCOMPLETE_SCHEMAS = 'structured-data-incomplete-schemas',
  NO_JSON_LD = 'structured-data-no-json-ld',
}

export const STRUCTURED_DATA_ISSUES: Record<StructuredDataIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [StructuredDataIssueId.NO_STRUCTURED_DATA]: {
    severity: 'critical',
    description: 'No structured data found on the page',
    recommendation: 'Add JSON-LD structured data appropriate for your page type (Article, Product, FAQ, etc.)',
  },
  
  [StructuredDataIssueId.VALIDATION_ERRORS]: {
    severity: 'high',
    description: 'Structured data validation errors found',
    recommendation: 'Fix validation errors in structured data to ensure proper parsing by search engines',
  },
  
  [StructuredDataIssueId.MISSING_RECOMMENDED_TYPE]: {
    severity: 'medium',
    description: 'Missing recommended structured data for page type',
    recommendation: 'Add recommended structured data for better search visibility',
  },
  
  [StructuredDataIssueId.INCOMPLETE_SCHEMAS]: {
    severity: 'low',
    description: 'Schema(s) have minimal properties',
    recommendation: 'Enhance structured data with more properties like description, image, author, datePublished',
  },
  
  [StructuredDataIssueId.NO_JSON_LD]: {
    severity: 'medium',
    description: 'No JSON-LD format structured data found',
    recommendation: 'Migrate to JSON-LD format - it\'s the preferred format for search engines',
  },
};

export function createStructuredDataIssue(
  issueId: StructuredDataIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = STRUCTURED_DATA_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}