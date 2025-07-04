import { Injectable, Logger } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { LlmService } from '../../../../llm/services/llm.service';
import { LlmProvider } from '../../../../llm/interfaces/llm-provider.enum';
import { z } from 'zod';
import { PageCategoryType } from '../../../interfaces/page-category.interface';

// Zod schema for structured output
const CaseStudySchema = z.object({
  description: z.string().describe('A 1-2 sentence summary of the case study INCLUDING the key metric or result if available'),
  excerpt: z.string().describe('A direct quote from the content (50-150 chars) that best represents this case study, especially metrics or results'),
  keyMetric: z.string().nullable().optional().describe('The most impressive metric or result from this case study (e.g., "40% increase in revenue", "$2M saved")'),
  clientName: z.string().nullable().optional().describe('The client or company name if mentioned'),
  hasChallengeSolutionResultStructure: z.boolean().describe('Does it clearly follow a Challenge/Problem -> Solution -> Result/Outcome structure?'),
  hasQuantifiableMetrics: z.boolean().describe("Does it include specific, quantifiable data (e.g., '40% increase', 'saved $50,000', 'reduced time by 2 weeks')?"),
  hasAuthenticClientDetails: z.boolean().describe('Does it mention the client by name, include quotes, or other specific, non-generic details?'),
  sourceSection: z.string().describe('The section or URL where this case study was found')
});

const CaseStudiesAnalysisSchema = z.object({
  caseStudies: z.array(CaseStudySchema).describe('An array of all case studies found on the website'),
  analysis: z.string().describe('A brief overall summary of the findings and reasoning')
});

type CaseStudiesAnalysis = z.infer<typeof CaseStudiesAnalysisSchema>;

@Injectable()
export class CaseStudiesRule extends BaseAEORule {
  private readonly logger = new Logger(CaseStudiesRule.name);
  
  // Scoring thresholds
  private static readonly EXCELLENT_THRESHOLD = 5; // ≥5 high-quality case studies
  private static readonly GOOD_THRESHOLD = 2;      // 2-4 case studies
  private static readonly POOR_THRESHOLD = 1;      // 1 case study
  
  // Scoring values
  private static readonly SCORE_EXCELLENT = 100;
  private static readonly SCORE_GOOD = 80;
  private static readonly SCORE_POOR = 40;
  private static readonly SCORE_NOT_PRESENT = 0;
  
  // Quality criteria threshold
  private static readonly MIN_QUALITY_CRITERIA = 2; // At least 2 of 3 criteria must be met
  
  // Content analysis limits
  private static readonly MAX_CONTENT_LENGTH = 15000; // Characters to analyze
  private static readonly MIN_CONTENT_LENGTH = 100;   // Minimum content to analyze
  
  // LLM configuration
  private static readonly LLM_TEMPERATURE = 0.2;
  private static readonly LLM_MAX_TOKENS = 2000;
  
  // Provider fallback chain (ordered by cost efficiency and reliability)
  // 1. OpenAI Mini: Cheapest, good for structured output
  // 2. OpenAI GPT-4o: More expensive but highly reliable
  // 3. Anthropic Haiku: Alternative provider for redundancy
  private static readonly LLM_PROVIDERS: Array<{ provider: LlmProvider; model: string }> = [
    { provider: LlmProvider.OpenAI, model: 'gpt-4o-mini' },
    { provider: LlmProvider.OpenAI, model: 'gpt-4o' },
    { provider: LlmProvider.Anthropic, model: 'claude-3-haiku-20240307' },
  ];
  
  constructor(
    private readonly llmService: LlmService
  ) {
    super(
      'case_studies',
      'Case Studies & Success Stories',
      'CONTENT' as Category,
      {
        impactScore: 3,
        pageTypes: [PageCategoryType.CASE_STUDY_SUCCESS_STORY, PageCategoryType.BLOG_POST_ARTICLE],
        isDomainLevel: true
      }
    );
  }

  private isHighQuality(study: z.infer<typeof CaseStudySchema>): boolean {
    const criteriaMet = [
      study.hasChallengeSolutionResultStructure,
      study.hasQuantifiableMetrics,
      study.hasAuthenticClientDetails,
    ].filter(Boolean).length;
    return criteriaMet >= CaseStudiesRule.MIN_QUALITY_CRITERIA;
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    let score = 0;
    
    const cleanText = content.cleanContent || '';
    
    // Prepare content for LLM analysis (limit to prevent token overflow)
    const contentForAnalysis = cleanText.substring(0, CaseStudiesRule.MAX_CONTENT_LENGTH);
    
    // Validate content is sufficient for analysis
    if (!contentForAnalysis || contentForAnalysis.trim().length < CaseStudiesRule.MIN_CONTENT_LENGTH) {
      evidence.push(EvidenceHelper.error('Insufficient content to analyze for case studies'));
      return this.createResult(CaseStudiesRule.SCORE_NOT_PRESENT, evidence);
    }
    
    // Check if LLM service is available
    if (!this.llmService) {
      throw new Error('LlmService is required for CaseStudiesRule evaluation');
    }
    
    // Declare variables outside try-catch for scope access
    let llmResponse: CaseStudiesAnalysis;
    let successfulProvider: string | null = null;
    let lastError: Error | null = null;
    
    // Define the enhanced prompt with clear definitions and examples
    const prompt = `Analyze the provided website content to identify case studies.

IMPORTANT DEFINITIONS:
- Case Study: A detailed narrative showing how a product/service solved a specific client problem
- NOT a Case Study: Generic testimonials, brief quotes, or vague success claims

EVALUATION CRITERIA:
1. **Structure**: Must have ALL three: Problem/Challenge, Solution/Approach, Result/Outcome
2. **Quantifiable Metrics**: ONLY accept specific numbers (e.g., "47% increase", "$125,000 saved", "3 hours reduced to 20 minutes")
   DO NOT accept vague terms like "significant", "improved", "better", "enhanced", "boosted"
3. **Authentic Details**: Real company names, person names with titles, or direct quotes with attribution

EDGE CASES:
- If multiple mini-cases are in one section, count each separately
- If a case study is incomplete (missing one of the three parts), mark it as NOT meeting criteria
- Industry reports or third-party studies are NOT company case studies
- Awards or certifications alone are NOT case studies

IMPORTANT: For each case study found, you MUST provide:
- An exact excerpt (direct quote) from the content that best represents the case study
- Focus excerpts on metrics, results, or key outcomes when available
- Keep excerpts between 50-150 characters

Based on your analysis of the text below, extract all true case studies you can find.
If no case studies are found, return an empty array for "caseStudies".

URL: ${url}

Website Content:
${contentForAnalysis}`;

    try {
      // Try providers in order
      for (const { provider, model } of CaseStudiesRule.LLM_PROVIDERS) {
        try {
          if (this.llmService.isProviderAvailable(provider)) {
            llmResponse = await this.llmService.getStructuredOutput(
              provider,
              prompt,
              CaseStudiesAnalysisSchema,
              { 
                model,
                temperature: CaseStudiesRule.LLM_TEMPERATURE,
                maxTokens: CaseStudiesRule.LLM_MAX_TOKENS
              }
            );
            successfulProvider = `${provider}/${model}`;
            this.logger.log(`CaseStudiesRule: Successfully used ${successfulProvider} for analysis`);
            break;
          }
        } catch (error) {
          this.logger.error(`CaseStudiesRule: LLM provider ${provider}/${model} failed:`, error);
          lastError = new Error(`${provider}/${model} failed: ${error.message}`);
          continue;
        }
      }
      
      if (!llmResponse!) {
        // If all LLM providers fail, throw error
        throw lastError || new Error('All LLM providers failed to analyze case studies');
      }
      
      // Process LLM results
      const highQualityCount = llmResponse.caseStudies.filter(study => this.isHighQuality(study)).length;
      const totalCount = llmResponse.caseStudies.length;
      
      // Apply scoring based on CSV requirements
      if (highQualityCount >= CaseStudiesRule.EXCELLENT_THRESHOLD) {
        score = CaseStudiesRule.SCORE_EXCELLENT;
        evidence.push(EvidenceHelper.success(`Found ${highQualityCount} high-quality case studies with detailed structure and metrics`, { target: 'guidance', score: 100 }));
        evidence.push(EvidenceHelper.info('◐ Excellent portfolio of case studies demonstrating proven results'));
      } else if (highQualityCount >= CaseStudiesRule.GOOD_THRESHOLD) {
        score = CaseStudiesRule.SCORE_GOOD;
        evidence.push(EvidenceHelper.success(`Found ${highQualityCount} case studies with good structure`, { target: 'guidance', score: 80 }));
        evidence.push(EvidenceHelper.warning('Good case study content, could expand portfolio for stronger credibility'));
      } else if (totalCount >= CaseStudiesRule.POOR_THRESHOLD) {
        score = CaseStudiesRule.SCORE_POOR;
        evidence.push(EvidenceHelper.warning(`Found ${totalCount} case studies but only ${highQualityCount} meet quality standards`, { target: 'guidance', score: 40 }));
        evidence.push(EvidenceHelper.warning('Case studies need more detail, metrics, and client authenticity'));
      } else {
        score = CaseStudiesRule.SCORE_NOT_PRESENT;
        evidence.push(EvidenceHelper.error('No substantial case studies or success stories found', { target: 'guidance', score: 0 }));
        evidence.push(EvidenceHelper.error('Add detailed case studies to demonstrate expertise and build trust'));
      }
      
      // Add specific feedback about found case studies with content excerpts
      llmResponse.caseStudies.forEach((study, index) => {
        const quality = this.isHighQuality(study) ? '✓' : '○';
        evidence.push(EvidenceHelper.info(`${quality} Case Study #${index + 1}: ${study.description}`));
        
        // Add client name if available
        if (study.clientName) {
          evidence.push(EvidenceHelper.info(`  🏢 Client: ${study.clientName}`));
        }
        
        // Add key metric if available
        if (study.keyMetric) {
          evidence.push(EvidenceHelper.info(`  📊 Key Result: ${study.keyMetric}`));
        }
        
        // Add the exact excerpt provided by LLM
        if (study.excerpt) {
          evidence.push(EvidenceHelper.info(`  📝 Excerpt: "${study.excerpt}"`));
        }
        
        // Add specific quality indicators
        const qualityIndicators: string[] = [];
        if (study.hasChallengeSolutionResultStructure) {
          qualityIndicators.push('✓ Complete structure');
        } else {
          qualityIndicators.push('✗ Incomplete structure');
        }
        
        if (study.hasQuantifiableMetrics) {
          qualityIndicators.push('✓ Has metrics');
        } else {
          qualityIndicators.push('✗ No specific metrics');
        }
        
        if (study.hasAuthenticClientDetails) {
          qualityIndicators.push('✓ Named client');
        } else {
          qualityIndicators.push('✗ Anonymous client');
        }
        
        evidence.push(EvidenceHelper.info(`  Quality: ${qualityIndicators.join(', ')}`));
        evidence.push(EvidenceHelper.info(`  Location: ${study.sourceSection}`));
      });
      
      // Add specific examples of missing elements if score is low
      if (score < CaseStudiesRule.SCORE_GOOD && llmResponse.caseStudies.length > 0) {
        evidence.push(EvidenceHelper.info('💡 To improve case studies, add:'));
        
        const needsMetrics = llmResponse.caseStudies.some(s => !s.hasQuantifiableMetrics);
        if (needsMetrics) {
          evidence.push(EvidenceHelper.info('  • Specific metrics (e.g., "reduced processing time by 47%", "saved $125,000 annually")'));
        }
        
        const needsStructure = llmResponse.caseStudies.some(s => !s.hasChallengeSolutionResultStructure);
        if (needsStructure) {
          evidence.push(EvidenceHelper.info('  • Clear problem → solution → result narrative structure'));
        }
        
        const needsAuthenticity = llmResponse.caseStudies.some(s => !s.hasAuthenticClientDetails);
        if (needsAuthenticity) {
          evidence.push(EvidenceHelper.info('  • Real client names, titles, and direct quotes'));
        }
      }
      
    } catch (error) {
      // Re-throw error - no fallback
      throw new Error(`Failed to analyze case studies: ${error.message}`);
    }
    
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (Requires external monitoring or manual assessment)`));
    
    // Capture AI usage information
    const aiUsage = successfulProvider ? {
      modelName: successfulProvider,
      prompt: prompt.substring(0, 500) + '...', // Truncate for storage
      response: JSON.stringify(llmResponse, null, 2).substring(0, 1000) + '...' // Truncate response
    } : undefined;
    
    return this.createResult(score, evidence, [], {}, [], aiUsage);
  }
}