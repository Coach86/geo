import { Injectable, Logger } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { LlmService } from '../../../../llm/services/llm.service';
import { LlmProvider } from '../../../../llm/interfaces/llm-provider.enum';
import { z } from 'zod';
import { PageCategoryType } from '../../../interfaces/page-category.interface';

// Zod schema for structured output
const CitationSchema = z.object({
  url: z.string().describe('The full URL of the cited source'),
  domain: z.string().describe('The domain name of the source (e.g., nature.com, gov.uk)'),
  excerpt: z.string().describe('A direct quote from the content (50-150 chars) showing how this source is referenced'),
  claimSupported: z.string().describe('The specific claim or statement this citation supports'),
  sourceType: z.enum(['government', 'education', 'research', 'news', 'industry', 'organization', 'other']).describe('Category of the source'),
  isReputable: z.boolean().describe('Whether this source is considered highly reputable (.gov, .edu, peer-reviewed journals, industry leaders)'),
  publicationDate: z.string().nullable().optional().describe('Publication date if mentioned (e.g., "2023", "March 2024")'),
  contextQuality: z.enum(['direct', 'supporting', 'tangential']).describe('How directly the citation supports the claim')
});

const CitationAnalysisSchema = z.object({
  citations: z.array(CitationSchema).describe('All citations found in the content'),
  hasFormalReferences: z.boolean().describe('Whether the page has a dedicated references/bibliography section'),
  citationStyle: z.enum(['academic', 'journalistic', 'informal', 'none']).describe('The dominant citation style used'),
  analysis: z.string().describe('Overall assessment of citation quality and authority')
});

type CitationAnalysis = z.infer<typeof CitationAnalysisSchema>;

@Injectable()
export class CitingSourcesRule extends BaseAEORule {
  private readonly logger = new Logger(CitingSourcesRule.name);

  // Scoring thresholds (based on CSV requirements)
  private static readonly EXCELLENT_DENSITY = 2; // ≥1 citation per ≤500 words
  private static readonly GOOD_DENSITY = 0.67; // ~1 citation per 1500 words
  private static readonly MIN_REPUTABLE_EXCELLENT = 5;
  private static readonly MIN_REPUTABLE_GOOD = 2;
  private static readonly RECENCY_EXCELLENT_MONTHS = 24;
  private static readonly RECENCY_GOOD_YEARS = 5;

  // Scoring values
  private static readonly SCORE_EXCELLENT = 100;
  private static readonly SCORE_GOOD = 80;
  private static readonly SCORE_MODERATE = 60;
  private static readonly SCORE_POOR = 40;
  private static readonly SCORE_NOT_PRESENT = 20;

  // Content analysis limits
  private static readonly MAX_CONTENT_LENGTH = 20000;
  private static readonly MIN_CONTENT_LENGTH = 100;

  // LLM configuration
  private static readonly LLM_TEMPERATURE = 0.1; // Very low for factual analysis
  private static readonly LLM_MAX_TOKENS = 2500;

  // Provider chain - Perplexity as primary per user request
  private static readonly LLM_PROVIDERS: Array<{ provider: LlmProvider; model: string }> = [
    { provider: LlmProvider.Perplexity, model: 'sonar' }, // Primary model
    { provider: LlmProvider.OpenAI, model: 'gpt-4o-mini' }, // Fallback
    { provider: LlmProvider.Anthropic, model: 'claude-3-haiku-20240307' }, // Secondary fallback
  ];

  constructor(
    private readonly llmService: LlmService
  ) {
    super(
      'citing_sources',
      'Citing Reputable Sources',
      'CONTENT' as Category,
      {
        impactScore: 3,
        pageTypes: [PageCategoryType.BLOG_POST_ARTICLE, PageCategoryType.IN_DEPTH_GUIDE_WHITE_PAPER, PageCategoryType.CASE_STUDY_SUCCESS_STORY, PageCategoryType.WHAT_IS_X_DEFINITIONAL_PAGE],
        isDomainLevel: false
      }
    );
  }

  private calculateRecencyScore(citations: z.infer<typeof CitationSchema>[]): number {
    const currentYear = new Date().getFullYear();
    let recentCount = 0;
    let moderatelyRecentCount = 0;

    citations.forEach(citation => {
      if (citation.publicationDate) {
        const yearMatch = citation.publicationDate.match(/20\d{2}/);
        if (yearMatch) {
          const year = parseInt(yearMatch[0]);
          const age = currentYear - year;
          if (age <= 2) recentCount++;
          else if (age <= 5) moderatelyRecentCount++;
        }
      }
    });

    const totalDated = citations.filter(c => c.publicationDate).length;
    if (totalDated === 0) return 0;

    const recentRatio = recentCount / totalDated;
    if (recentRatio >= 0.7) return 20; // 70%+ are recent
    if (recentRatio >= 0.5) return 15;
    if (moderatelyRecentCount / totalDated >= 0.5) return 10;
    return 5;
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 0;
    const scoreBreakdown: { component: string; points: number }[] = [];

    const cleanText = content.cleanContent || '';
    const html = content.html || '';

    // Prepare content for LLM analysis
    const contentForAnalysis = cleanText.substring(0, CitingSourcesRule.MAX_CONTENT_LENGTH);

    // Validate content
    if (!contentForAnalysis || contentForAnalysis.trim().length < CitingSourcesRule.MIN_CONTENT_LENGTH) {
      evidence.push(EvidenceHelper.error('Insufficient content to analyze for citations'));
      return this.createResult(CitingSourcesRule.SCORE_NOT_PRESENT, evidence);
    }

    // Check LLM availability
    if (!this.llmService) {
      throw new Error('LlmService is required for CitingSourcesRule evaluation');
    }

    // Declare variables outside try-catch for scope access
    let llmResponse: CitationAnalysis;
    let successfulProvider: string | null = null;
    let lastError: Error | null = null;

    // Enhanced prompt for citation analysis
    const prompt = `Analyze the provided website content to identify all citations and references to external sources.

IMPORTANT DEFINITIONS:
- Citation: Any reference to an external source, including hyperlinks, textual references, footnotes, or bibliography entries
- Reputable Source: Government sites (.gov), educational institutions (.edu), peer-reviewed journals, established industry authorities, major news outlets
- NOT a Citation: Internal links, navigation links, social media links, or generic mentions without source attribution

EVALUATION CRITERIA:
1. **Source Reputability**:
   - HIGHLY REPUTABLE: .gov, .edu, peer-reviewed journals (Nature, Science, NEJM, etc.), major research institutions
   - REPUTABLE: Established news outlets (Reuters, WSJ, BBC), industry leaders (Gartner, McKinsey), .org domains
   - OTHER: All other sources

2. **Context Quality**:
   - DIRECT: Source directly supports a specific claim with data/evidence
   - SUPPORTING: Source provides general context or background
   - TANGENTIAL: Source is only loosely related to the claim

3. **Citation Styles**:
   - ACADEMIC: Formal citations with author, year, publication details
   - JOURNALISTIC: Inline attributions and hyperlinks
   - INFORMAL: Basic mentions or links without formal structure
   - NONE: No clear citation style

IMPORTANT: For each citation found, you MUST provide:
- An exact excerpt showing how the source is referenced in the content
- The specific claim or statement the citation supports
- Focus excerpts on the citation context (50-150 characters)

Analyze for:
1. All hyperlinked external sources
2. Textual references (e.g., "According to Harvard research...")
3. Footnotes or endnotes
4. Bibliography or references sections
5. In-text citations (Author, Year) format

URL: ${url}

Website Content:
${contentForAnalysis}

HTML (for link extraction):
${html.substring(0, 5000)}`;

    try {
      // Try providers in order

      for (const { provider, model } of CitingSourcesRule.LLM_PROVIDERS) {
        try {
          if (this.llmService.isProviderAvailable(provider)) {
            llmResponse = await this.llmService.getStructuredOutput(
              provider,
              prompt,
              CitationAnalysisSchema,
              {
                model,
                temperature: CitingSourcesRule.LLM_TEMPERATURE,
                maxTokens: CitingSourcesRule.LLM_MAX_TOKENS
              }
            );
            successfulProvider = `${provider}/${model}`;
            this.logger.log(`CitingSourcesRule: Successfully used ${successfulProvider} for analysis`);
            break;
          }
        } catch (error) {
          this.logger.error(`CitingSourcesRule: Provider ${provider}/${model} failed:`, error);
          lastError = new Error(`${provider}/${model} failed: ${error.message}`);
          continue;
        }
      }

      if (!llmResponse!) {
        throw lastError || new Error('All LLM providers failed to analyze citations');
      }

      // Process results
      const reputableCitations = llmResponse.citations.filter(c => c.isReputable);
      const totalCitations = llmResponse.citations.length;
      const wordCount = cleanText.split(/\s+/).length;
      const citationDensity = wordCount > 0 ? (totalCitations / wordCount) * 1000 : 0;

      // Calculate base score based on density and quality
      if (reputableCitations.length >= CitingSourcesRule.MIN_REPUTABLE_EXCELLENT &&
          citationDensity >= CitingSourcesRule.EXCELLENT_DENSITY) {
        score = CitingSourcesRule.SCORE_EXCELLENT;
        scoreBreakdown.push({ component: 'Excellent citation quality', points: CitingSourcesRule.SCORE_EXCELLENT });
        evidence.push(EvidenceHelper.success(`Excellent citation density: ${citationDensity.toFixed(1)} per 1000 words with ${reputableCitations.length} reputable sources`, { target: 'Excellent citation practice', score: CitingSourcesRule.SCORE_EXCELLENT }));
      } else if (reputableCitations.length >= CitingSourcesRule.MIN_REPUTABLE_GOOD &&
                 citationDensity >= CitingSourcesRule.GOOD_DENSITY) {
        score = CitingSourcesRule.SCORE_GOOD;
        scoreBreakdown.push({ component: 'Good citation practice', points: CitingSourcesRule.SCORE_GOOD });
        evidence.push(EvidenceHelper.success(`Good citation practice: ${reputableCitations.length} reputable sources`, { target: 'Good citation practice', score: CitingSourcesRule.SCORE_GOOD }));
      } else if (reputableCitations.length >= 1) {
        score = CitingSourcesRule.SCORE_MODERATE;
        scoreBreakdown.push({ component: 'Moderate citations', points: CitingSourcesRule.SCORE_MODERATE });
        evidence.push(EvidenceHelper.warning(`Moderate citations: ${reputableCitations.length} reputable sources`, { target: 'Improve citation quality', score: CitingSourcesRule.SCORE_MODERATE }));
      } else if (totalCitations > 0) {
        score = CitingSourcesRule.SCORE_POOR;
        scoreBreakdown.push({ component: 'Poor citation quality', points: CitingSourcesRule.SCORE_POOR });
        evidence.push(EvidenceHelper.warning(`Found ${totalCitations} citations but none from highly reputable sources`, { target: 'Add reputable sources', score: CitingSourcesRule.SCORE_POOR }));
      } else {
        score = CitingSourcesRule.SCORE_NOT_PRESENT;
        scoreBreakdown.push({ component: 'Base score', points: CitingSourcesRule.SCORE_NOT_PRESENT });
        evidence.push(EvidenceHelper.info('Base score', { target: 'Starting point', score: CitingSourcesRule.SCORE_NOT_PRESENT }));
        evidence.push(EvidenceHelper.error('No external citations found', { target: 'Add citations to external sources' }));
        recommendations.push(`${CitingSourcesRule.MIN_REPUTABLE_GOOD}+ reputable sources for good score (80/100)`);
        recommendations.push(`${CitingSourcesRule.MIN_REPUTABLE_EXCELLENT}+ reputable sources for excellent score (100/100)`);
      }

      // Add bonus for formal references section
      if (llmResponse.hasFormalReferences) {
        const bonus = Math.min(10, 100 - score);
        score = Math.min(100, score + bonus);
        scoreBreakdown.push({ component: 'Formal references section', points: bonus });
        evidence.push(EvidenceHelper.success('Has dedicated references/bibliography section', { target: 'Maintain formal references', score: bonus }));
      }

      // Add bonus for citation recency
      const recencyBonus = this.calculateRecencyScore(llmResponse.citations);
      if (recencyBonus > 0) {
        const actualBonus = Math.min(recencyBonus, 100 - score);
        score = Math.min(100, score + actualBonus);
        scoreBreakdown.push({ component: 'Recent sources', points: actualBonus });
        evidence.push(EvidenceHelper.success(`Sources are current (recency bonus: +${actualBonus})`, { target: 'Keep sources current', score: actualBonus }));
      }

      // Break down citations by type
      const citationsByType = llmResponse.citations.reduce((acc, c) => {
        acc[c.sourceType] = (acc[c.sourceType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      evidence.push(EvidenceHelper.info(`Total citations: ${totalCitations}`, { target: `≥${CitingSourcesRule.MIN_REPUTABLE_GOOD} reputable sources for good score` }));
      evidence.push(EvidenceHelper.info(`Reputable sources: ${reputableCitations.length}`, { target: `≥${CitingSourcesRule.MIN_REPUTABLE_GOOD} for good, ≥${CitingSourcesRule.MIN_REPUTABLE_EXCELLENT} for excellent` }));
      evidence.push(EvidenceHelper.info(`Citation density: ${citationDensity.toFixed(2)} per 1000 words`, { target: `≥${CitingSourcesRule.GOOD_DENSITY} per 1000 words for good score` }));
      evidence.push(EvidenceHelper.info(`Citation style: ${llmResponse.citationStyle}`, { target: 'Academic or journalistic style preferred' }));
      
      if (totalCitations > 0) {
        evidence.push(EvidenceHelper.info('By source type:'));
        if (citationsByType.government > 0) {
          evidence.push(EvidenceHelper.info(`${citationsByType.government} government sources`));
        }
        if (citationsByType.education > 0) {
          evidence.push(EvidenceHelper.info(`${citationsByType.education} educational sources`));
        }
        if (citationsByType.research > 0) {
          evidence.push(EvidenceHelper.info(`${citationsByType.research} research/academic sources`));
        }
        if (citationsByType.news > 0) {
          evidence.push(EvidenceHelper.info(`${citationsByType.news} news sources`));
        }
        if (citationsByType.industry > 0) {
          evidence.push(EvidenceHelper.info(`${citationsByType.industry} industry sources`));
        }
      }

      // Add specific examples of high-quality citations
      const directCitations = llmResponse.citations.filter(c => c.contextQuality === 'direct' && c.isReputable);
      if (directCitations.length > 0) {
        evidence.push(EvidenceHelper.info('High-quality citations found:'));
        directCitations.slice(0, 3).forEach((citation, index) => {
          evidence.push(EvidenceHelper.info(`  ${index + 1}. ${citation.domain} - ${citation.claimSupported}`, citation.excerpt ? { code: `     📝 ${citation.excerpt}` } : {}));
        });
      }


      // Add detailed recommendations based on score
      if (score < CitingSourcesRule.SCORE_GOOD) {
        if (reputableCitations.length < CitingSourcesRule.MIN_REPUTABLE_GOOD) {
          const needed = CitingSourcesRule.MIN_REPUTABLE_GOOD - reputableCitations.length;
          recommendations.push(`Add ${needed} more citations from .gov, .edu, or peer-reviewed sources (current: ${reputableCitations.length}, target: ${CitingSourcesRule.MIN_REPUTABLE_GOOD}+)`);
        }
        if (citationDensity < CitingSourcesRule.GOOD_DENSITY) {
          const targetCitations = Math.ceil((wordCount / 1000) * CitingSourcesRule.GOOD_DENSITY);
          recommendations.push(`Increase citation density to ${CitingSourcesRule.GOOD_DENSITY} per 1000 words (need ~${targetCitations} total citations for ${wordCount} words)`);
        }
        if (!llmResponse.hasFormalReferences) {
          recommendations.push('Add a formal references or bibliography section (+10 points bonus)');
        }
        if (recencyBonus < 10) {
          recommendations.push('Update sources to include more recent publications (within 24 months for maximum +20 points bonus)');
        }
      }

    } catch (error) {
      throw new Error(`Failed to analyze citations: ${error.message}`);
    }

    // Add score calculation explanation using the same format as other rules
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    // Capture AI usage information
    const aiUsage = successfulProvider ? {
      modelName: successfulProvider,
      prompt: prompt.substring(0, 500) + '...', // Truncate for storage
      response: JSON.stringify(llmResponse, null, 2).substring(0, 1000) + '...' // Truncate response
    } : undefined;
    
    return this.createResult(score, evidence, [], { scoreBreakdown }, recommendations, aiUsage);
  }
}
