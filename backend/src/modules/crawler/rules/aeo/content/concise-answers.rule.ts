import { Injectable, Logger } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem, RuleIssue } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { LlmService } from '../../../../llm/services/llm.service';
import { LlmProvider } from '../../../../llm/interfaces/llm-provider.enum';
import { z } from 'zod';
import { PageCategoryType } from '../../../interfaces/page-category.interface';
import { ConciseAnswersIssueId, createConciseAnswersIssue } from './concise-answers.issues';

// Evidence topics for this rule
enum ConciseAnswersTopic {
  ANSWER_STRUCTURE = 'Answer Structure',
  SUMMARY_SECTION = 'Summary Section',
  ANSWER_INDICATORS = 'Answer Indicators',
  STRUCTURE = 'Structure',
  SENTENCE_COMPLEXITY = 'Sentence Complexity',
  CONTENT_ORGANIZATION = 'Content Organization'
}

// Zod schema for structured output
const ConciseAnswersSchema = z.object({
  hasSummarySection: z.boolean().describe('Whether the content has a clear summary, TL;DR, key points, or overview section'),
  summaryLocation: z.enum(['beginning', 'end', 'middle', 'none']).describe('Where the summary section is located'),
  summaryExcerpt: z.string().nullable().describe('A direct quote from the summary section if found'),
  
  hasEarlyLists: z.boolean().describe('Whether bullet points, numbered lists, or structured lists appear in the first half of content'),
  listExamples: z.array(z.string()).describe('Examples of list items found in early content'),
  
  hasAnswerIndicators: z.boolean().describe('Whether the content uses direct answer phrases like "the answer is", "in short", "simply put"'),
  answerIndicatorExamples: z.array(z.string()).describe('Examples of direct answer indicators found'),
  
  averageSentenceLength: z.number().describe('Average words per sentence in the first paragraph'),
  sentenceComplexity: z.enum(['concise', 'moderate', 'complex']).describe('Overall sentence complexity: concise (≤20 words), moderate (21-30 words), complex (>30 words)'),
  
  hasStructuredFormat: z.boolean().describe('Whether content uses numbered steps, clear phases, or organized structure'),
  structureExamples: z.array(z.string()).describe('Examples of structural elements found'),
  
  contentUpfrontness: z.enum(['excellent', 'good', 'moderate', 'poor']).describe('How well the content provides upfront, scannable answers'),
  
  analysis: z.string().describe('Overall assessment of how concise and upfront the content is')
});

type ConciseAnswersAnalysis = z.infer<typeof ConciseAnswersSchema>;

@Injectable()
export class ConciseAnswersRule extends BaseAEORule {
  private readonly logger = new Logger(ConciseAnswersRule.name);

  // Scoring values
  private static readonly SCORE_EXCELLENT = 100;
  private static readonly SCORE_GOOD = 80;
  private static readonly SCORE_MODERATE = 60;
  private static readonly SCORE_POOR = 40;
  private static readonly SCORE_NOT_PRESENT = 20;

  // Content analysis limits
  private static readonly MAX_CONTENT_LENGTH = 15000;
  private static readonly MIN_CONTENT_LENGTH = 100;

  // LLM configuration
  private static readonly LLM_TEMPERATURE = 0.2;
  private static readonly LLM_MAX_TOKENS = 2000;

  // Provider chain - Zen MCP first as requested
  private static readonly LLM_PROVIDERS: Array<{ provider: LlmProvider; model: string }> = [
    { provider: LlmProvider.OpenAI, model: 'gpt-4o-mini' }, // Primary model
    { provider: LlmProvider.Anthropic, model: 'claude-3-haiku-20240307' }, // Fallback
    { provider: LlmProvider.Google, model: 'gemini-1.5-flash' }, // Secondary fallback
  ];

  constructor(
    private readonly llmService: LlmService
  ) {
    super(
      'concise_answers',
      'Concise, Upfront Answers',
      'AUTHORITY' as Category,
      {
        impactScore: 3,
        pageTypes: [
          PageCategoryType.BLOG_POST_ARTICLE,
          PageCategoryType.IN_DEPTH_GUIDE_WHITE_PAPER,
          PageCategoryType.WHAT_IS_X_DEFINITIONAL_PAGE,
          PageCategoryType.HOW_TO_GUIDE_TUTORIAL,
          PageCategoryType.FAQ_GLOSSARY_PAGES
        ],
        isDomainLevel: false
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 0;
    const scoreBreakdown: { component: string; points: number }[] = [];

    const cleanText = content.cleanContent || '';
    const html = content.html || '';

    // Prepare content for LLM analysis
    const contentForAnalysis = cleanText.substring(0, ConciseAnswersRule.MAX_CONTENT_LENGTH);

    // Validate content
    if (!contentForAnalysis || contentForAnalysis.trim().length < ConciseAnswersRule.MIN_CONTENT_LENGTH) {
      evidence.push(EvidenceHelper.error(ConciseAnswersTopic.STRUCTURE, 'Insufficient content to analyze for concise answers', { score: 0 }));
      const issues: RuleIssue[] = [{
        id: 'concise-answers-insufficient-content',
        severity: 'high',
        description: 'Insufficient content to analyze for concise answers',
        recommendation: 'Add more substantial content (at least 100 characters) to enable analysis'
      }];
      return this.createResult(ConciseAnswersRule.SCORE_NOT_PRESENT, evidence, issues, {}, recommendations);
    }

    // Check LLM availability
    if (!this.llmService) {
      throw new Error('LlmService is required for ConciseAnswersRule evaluation');
    }

    // Declare variables outside try-catch for scope access
    let llmResponse: ConciseAnswersAnalysis;
    let successfulProvider: string | null = null;
    let lastError: Error | null = null;

    // Enhanced prompt for concise answers analysis
    const prompt = `Analyze the provided website content to evaluate how well it provides concise, upfront answers that are easy to scan and understand.

IMPORTANT: This analysis should work for ANY LANGUAGE. Look for language-agnostic patterns and structures.

EVALUATION CRITERIA:

1. **Summary Sections**: Look for:
   - Summary/overview sections at the beginning
   - "TL;DR" or "Key Points" sections
   - Executive summary or abstract
   - Highlight boxes or callouts
   - Any section that provides a condensed version of the main content

2. **Early Lists and Structure**: Look for:
   - Bullet points or numbered lists in the first half of content
   - Table of contents
   - Quick navigation elements
   - Structured formats that help scanning

3. **Answer Indicators**: Look for phrases that signal direct answers:
   - "The answer is...", "In short...", "Simply put..."
   - "Here's what you need to know..."
   - "The key is...", "Bottom line..."
   - Language-specific equivalents in other languages

4. **Sentence Complexity**: Analyze:
   - Average sentence length in opening paragraphs
   - Use of simple vs complex sentence structures
   - Readability and scannability

5. **Content Organization**: Look for:
   - Numbered steps or phases
   - Clear headings and subheadings
   - Logical flow from general to specific
   - Use of formatting to highlight key information

6. **Upfrontness Assessment**:
   - EXCELLENT: Immediate answers, clear summary, well-structured lists, scannable format
   - GOOD: Most information upfront, some structure, reasonably scannable
   - MODERATE: Some upfront information but requires reading to find answers
   - POOR: Information buried, requires extensive reading, poor structure

IMPORTANT: Provide specific excerpts and examples from the content to support your analysis.

URL: ${url}

Website Content:
${contentForAnalysis}

HTML Structure (for format detection):
${html.substring(0, 3000)}`;

    try {
      // Try providers in order
      for (const { provider, model } of ConciseAnswersRule.LLM_PROVIDERS) {
        try {
          if (this.llmService.isProviderAvailable(provider)) {
            llmResponse = await this.llmService.getStructuredOutput(
              provider,
              prompt,
              ConciseAnswersSchema,
              {
                model,
                temperature: ConciseAnswersRule.LLM_TEMPERATURE,
                maxTokens: ConciseAnswersRule.LLM_MAX_TOKENS
              }
            );
            successfulProvider = `${provider}/${model}`;
            this.logger.log(`ConciseAnswersRule: Successfully used ${successfulProvider} for analysis`);
            break;
          }
        } catch (error) {
          this.logger.error(`ConciseAnswersRule: Provider ${provider}/${model} failed:`, error);
          lastError = new Error(`${provider}/${model} failed: ${error.message}`);
          continue;
        }
      }

      if (!llmResponse!) {
        throw lastError || new Error('All LLM providers failed to analyze concise answers');
      }

      // Process results and calculate score
      let baseScore = 0;

      // Summary Section Analysis (25 points)
      if (llmResponse.hasSummarySection) {
        const summaryPoints = llmResponse.summaryLocation === 'beginning' ? 25 : 20;
        baseScore += summaryPoints;
        scoreBreakdown.push({ component: 'Summary section', points: summaryPoints });
        
        const locationMessage = llmResponse.summaryLocation === 'beginning' 
          ? 'Has summary/overview section at beginning (optimal)'
          : `Has summary/overview section at ${llmResponse.summaryLocation} (-5 pts for non-optimal placement)`;
          
        evidence.push(EvidenceHelper.success(ConciseAnswersTopic.SUMMARY_SECTION, locationMessage, {
          target: llmResponse.summaryLocation === 'beginning' 
            ? 'Maintain optimal summary placement' 
            : 'Move summary to beginning for +5 pts (25/25)',
          score: summaryPoints,
          maxScore: 25,
          code: llmResponse.summaryExcerpt ? `Summary excerpt: "${llmResponse.summaryExcerpt}"` : undefined
        }));
      } else {
        evidence.push(EvidenceHelper.error(ConciseAnswersTopic.SUMMARY_SECTION, 'No summary or key points section found', {
          target: 'Add a summary/TL;DR section at the beginning',
          score: 0,
          maxScore: 25
        }));
        recommendations.push('Add a summary or "TL;DR" section at the beginning of the content');
      }

      // Early Lists Analysis (20 points)
      if (llmResponse.hasEarlyLists) {
        baseScore += 20;
        scoreBreakdown.push({ component: 'Early lists', points: 20 });
        evidence.push(EvidenceHelper.success(ConciseAnswersTopic.ANSWER_STRUCTURE, 'Content includes early lists for scannability', {
          target: 'Early lists help users scan and find information quickly',
          score: 20,
          maxScore: 20,
          code: llmResponse.listExamples.length > 0 ? `List examples:\n${llmResponse.listExamples.slice(0, 3).join('\n')}` : undefined
        }));
      } else {
        evidence.push(EvidenceHelper.warning(ConciseAnswersTopic.ANSWER_STRUCTURE, 'No lists in the first half of content', {
          target: 'Add bullet points or numbered lists early in the content',
          score: 0,
          maxScore: 20
        }));
        recommendations.push('Include bullet points or numbered lists in the first half of the content');
      }

      // Answer Indicators Analysis (15 points)
      if (llmResponse.hasAnswerIndicators) {
        baseScore += 15;
        scoreBreakdown.push({ component: 'Answer indicators', points: 15 });
        evidence.push(EvidenceHelper.success(ConciseAnswersTopic.ANSWER_INDICATORS, 'Content uses direct answer indicators', {
          target: 'Direct answer indicators signal immediate value to users',
          score: 15,
          maxScore: 15,
          code: llmResponse.answerIndicatorExamples.length > 0 ? `Answer indicators found:\n${llmResponse.answerIndicatorExamples.slice(0, 3).join('\n')}` : undefined
        }));
      } else {
        evidence.push(EvidenceHelper.warning(ConciseAnswersTopic.ANSWER_INDICATORS, 'No clear answer indicators found', {
          target: 'Add phrases like "The answer is...", "In short...", "Simply put..."',
          score: 0,
          maxScore: 15
        }));
        recommendations.push('Include direct answer phrases like "The answer is...", "In short...", or "Simply put..."');
      }

      // Sentence Complexity Analysis (20 points)
      let sentencePoints = 0;
      let complexityExplanation = '';
      let complexityTarget = '';
      
      if (llmResponse.sentenceComplexity === 'concise') {
        sentencePoints = 20;
        complexityExplanation = `Sentence complexity: concise (avg ${llmResponse.averageSentenceLength} words) - optimal`;
        complexityTarget = 'Maintain concise sentence length (≤20 words)';
      } else if (llmResponse.sentenceComplexity === 'moderate') {
        sentencePoints = 10;
        complexityExplanation = `Sentence complexity: moderate (avg ${llmResponse.averageSentenceLength} words) - could be improved`;
        complexityTarget = 'Reduce average sentence length to ≤20 words for +10 pts (20/20)';
      } else {
        sentencePoints = 0;
        complexityExplanation = `Sentence complexity: complex (avg ${llmResponse.averageSentenceLength} words) - too long`;
        complexityTarget = 'Break down long sentences to ≤20 words for +20 pts (20/20)';
      }
      
      baseScore += sentencePoints;
      scoreBreakdown.push({ component: 'Sentence complexity', points: sentencePoints });

      evidence.push(EvidenceHelper.info(ConciseAnswersTopic.SENTENCE_COMPLEXITY, complexityExplanation, {
        target: complexityTarget,
        score: sentencePoints,
        maxScore: 20
      }));

      if (llmResponse.sentenceComplexity === 'complex') {
        recommendations.push('Break down long sentences for better readability (aim for ≤20 words per sentence)');
      } else if (llmResponse.sentenceComplexity === 'moderate') {
        recommendations.push('Reduce sentence length slightly for better scannability (aim for ≤20 words per sentence)');
      }

      // Content Structure Analysis (20 points)
      if (llmResponse.hasStructuredFormat) {
        baseScore += 20;
        scoreBreakdown.push({ component: 'Structured format', points: 20 });
        evidence.push(EvidenceHelper.success(ConciseAnswersTopic.CONTENT_ORGANIZATION, 'Content uses structured format', {
          target: 'Structured formats improve scannability',
          score: 20,
          maxScore: 20,
          code: llmResponse.structureExamples.length > 0 ? `Structure examples:\n${llmResponse.structureExamples.slice(0, 3).join('\n')}` : undefined
        }));
      } else {
        evidence.push(EvidenceHelper.warning(ConciseAnswersTopic.CONTENT_ORGANIZATION, 'Content lacks structured format', {
          target: 'Add numbered steps, clear phases, or organized structure',
          score: 0,
          maxScore: 20
        }));
        recommendations.push('Organize content with numbered steps, clear phases, or structured headings');
      }

      // Calculate final score
      score = Math.min(100, Math.max(0, baseScore));

      // Overall assessment based on LLM analysis
      const upfrontnessMap = {
        'excellent': { type: 'success' as const, message: 'Excellent concise, upfront answer structure' },
        'good': { type: 'success' as const, message: 'Good upfront answer structure with minor improvements possible' },
        'moderate': { type: 'warning' as const, message: 'Moderate upfront answers - could be more direct' },
        'poor': { type: 'error' as const, message: 'Poor upfront answer structure - answers are buried in text' }
      };

      const assessment = upfrontnessMap[llmResponse.contentUpfrontness];
      evidence.push(EvidenceHelper[assessment.type](ConciseAnswersTopic.STRUCTURE, assessment.message, {
        target: llmResponse.contentUpfrontness === 'excellent' ? 'Maintain excellent structure' : 'Improve content upfrontness and scannability',
        code: `Analysis: ${llmResponse.analysis}`
      }));

      // Add targeted recommendations based on what's missing
      if (score < 80) {
        if (!llmResponse.hasSummarySection) {
          recommendations.push('Add a clear summary or key points section at the beginning');
        }
        if (!llmResponse.hasEarlyLists) {
          recommendations.push('Include bullet points or lists in the first half of content');
        }
        if (!llmResponse.hasAnswerIndicators) {
          recommendations.push('Use direct answer phrases to signal value to readers');
        }
        if (!llmResponse.hasStructuredFormat) {
          recommendations.push('Organize content with clear structure and headings');
        }
      }

    } catch (error) {
      throw new Error(`Failed to analyze concise answers: ${error.message}`);
    }

    // Generate issues based on problems found
    const issues: RuleIssue[] = [];
    
    if (!llmResponse.hasSummarySection) {
      issues.push(createConciseAnswersIssue(ConciseAnswersIssueId.NO_SUMMARY_SECTION));
    } else if (llmResponse.summaryLocation !== 'beginning' && llmResponse.summaryLocation !== 'none') {
      issues.push(createConciseAnswersIssue(
        ConciseAnswersIssueId.SUMMARY_NOT_AT_BEGINNING,
        undefined,
        `Summary section exists but is at the ${llmResponse.summaryLocation} of the content`
      ));
    }
    
    if (!llmResponse.hasEarlyLists) {
      issues.push(createConciseAnswersIssue(ConciseAnswersIssueId.NO_EARLY_LISTS));
    }
    
    if (!llmResponse.hasAnswerIndicators) {
      issues.push(createConciseAnswersIssue(ConciseAnswersIssueId.NO_ANSWER_INDICATORS));
    }
    
    if (llmResponse.sentenceComplexity === 'complex') {
      issues.push(createConciseAnswersIssue(
        ConciseAnswersIssueId.COMPLEX_SENTENCES,
        undefined,
        `Sentence complexity is too high (avg ${llmResponse.averageSentenceLength} words)`
      ));
    } else if (llmResponse.sentenceComplexity === 'moderate') {
      issues.push(createConciseAnswersIssue(
        ConciseAnswersIssueId.MODERATE_SENTENCES,
        undefined,
        `Sentence complexity could be improved (avg ${llmResponse.averageSentenceLength} words)`
      ));
    }
    
    if (!llmResponse.hasStructuredFormat) {
      issues.push(createConciseAnswersIssue(ConciseAnswersIssueId.LACKS_STRUCTURED_FORMAT));
    }
    
    if (llmResponse.contentUpfrontness === 'poor') {
      issues.push(createConciseAnswersIssue(ConciseAnswersIssueId.POOR_UPFRONTNESS));
    } else if (llmResponse.contentUpfrontness === 'moderate') {
      issues.push(createConciseAnswersIssue(ConciseAnswersIssueId.MODERATE_UPFRONTNESS));
    }

    // Add score calculation explanation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));

    // Capture AI usage information
    const aiUsage = successfulProvider ? {
      modelName: successfulProvider,
      prompt: prompt.substring(0, 500) + '...', // Truncate for storage
      response: JSON.stringify(llmResponse, null, 2).substring(0, 1000) + '...' // Truncate response
    } : undefined;

    return this.createResult(score, evidence, issues, { scoreBreakdown }, recommendations, aiUsage);
  }
}