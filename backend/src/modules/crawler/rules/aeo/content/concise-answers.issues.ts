import { RuleIssue } from '../../../interfaces/rule.interface';

export enum ConciseAnswersIssueId {
  NO_SUMMARY_SECTION = 'concise-answers-no-summary',
  SUMMARY_NOT_AT_BEGINNING = 'concise-answers-summary-position',
  NO_EARLY_LISTS = 'concise-answers-no-early-lists',
  NO_ANSWER_INDICATORS = 'concise-answers-no-answer-indicators',
  COMPLEX_SENTENCES = 'concise-answers-complex-sentences',
  MODERATE_SENTENCES = 'concise-answers-moderate-sentences',
  LACKS_STRUCTURED_FORMAT = 'concise-answers-lacks-structure',
  POOR_UPFRONTNESS = 'concise-answers-poor-upfrontness',
  MODERATE_UPFRONTNESS = 'concise-answers-moderate-upfrontness',
}

export const CONCISE_ANSWERS_ISSUES: Record<ConciseAnswersIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [ConciseAnswersIssueId.NO_SUMMARY_SECTION]: {
    severity: 'high',
    description: 'No summary or key points section found',
    recommendation: 'Add a summary or "TL;DR" section at the beginning of the content',
  },
  
  [ConciseAnswersIssueId.SUMMARY_NOT_AT_BEGINNING]: {
    severity: 'medium',
    description: 'Summary section exists but not at the beginning',
    recommendation: 'Move summary section to the beginning for better scannability',
  },
  
  [ConciseAnswersIssueId.NO_EARLY_LISTS]: {
    severity: 'medium',
    description: 'No lists in the first half of content',
    recommendation: 'Include bullet points or numbered lists in the first half of the content',
  },
  
  [ConciseAnswersIssueId.NO_ANSWER_INDICATORS]: {
    severity: 'low',
    description: 'No clear answer indicators found',
    recommendation: 'Add phrases like "The answer is...", "In short...", "Simply put..."',
  },
  
  [ConciseAnswersIssueId.COMPLEX_SENTENCES]: {
    severity: 'medium',
    description: 'Sentence complexity is too high',
    recommendation: 'Break down long sentences for better readability (aim for ≤20 words per sentence)',
  },
  
  [ConciseAnswersIssueId.MODERATE_SENTENCES]: {
    severity: 'low',
    description: 'Sentence complexity could be improved',
    recommendation: 'Reduce sentence length slightly for better scannability (aim for ≤20 words per sentence)',
  },
  
  [ConciseAnswersIssueId.LACKS_STRUCTURED_FORMAT]: {
    severity: 'medium',
    description: 'Content lacks structured format',
    recommendation: 'Organize content with numbered steps, clear phases, or structured headings',
  },
  
  [ConciseAnswersIssueId.POOR_UPFRONTNESS]: {
    severity: 'high',
    description: 'Poor upfront answer structure - answers are buried in text',
    recommendation: 'Restructure content to provide immediate answers and key information upfront',
  },
  
  [ConciseAnswersIssueId.MODERATE_UPFRONTNESS]: {
    severity: 'low',
    description: 'Moderate upfront answers - could be more direct',
    recommendation: 'Make answers more direct and easier to find at the beginning of content',
  },
};

export function createConciseAnswersIssue(
  issueId: ConciseAnswersIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = CONCISE_ANSWERS_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}