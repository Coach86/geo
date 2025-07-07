import { Injectable, Logger } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult,
  PageContent,
  Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { LlmService } from '../../../../llm/services/llm.service';
import { LlmProvider } from '../../../../llm/interfaces/llm-provider.enum';
import { z } from 'zod';

// Evidence topics for this rule
enum PressReleaseTopic {
  PRESS_RELEASES_FOUND = 'Press Releases Found',
  DISTRIBUTION_QUALITY = 'Distribution Quality',
  RECENCY = 'Recency',
  FREQUENCY = 'Frequency',
  PLATFORM_COVERAGE = 'Platform Coverage',
  COMPANY_NEWS = 'Company News Section'
}

// Zod schema for structured output
const PressReleaseSchema = z.object({
  title: z.string().describe('Title of the press release'),
  url: z.string().describe('URL of the press release'),
  date: z.string().describe('Publication date (YYYY-MM-DD format if possible)'),
  platform: z.string().describe('Platform or outlet (e.g., PRNewswire, BusinessWire, Company Website)'),
  excerpt: z.string().describe('Brief excerpt or summary (50-150 chars)')
});

const PressReleaseAnalysisSchema = z.object({
  pressReleases: z.array(PressReleaseSchema).describe('List of press releases found'),
  hasCompanyNewsSection: z.boolean().describe('Whether the company website has a dedicated news/press section'),
  totalCount: z.number().describe('Total number of press releases found'),
  recentCount: z.number().describe('Number of press releases from last 3 months'),
  oldestDate: z.string().nullable().describe('Date of oldest press release found'),
  newestDate: z.string().nullable().describe('Date of newest press release found'),
  majorOutlets: z.array(z.string()).describe('List of major outlets/platforms used'),
  distributionFrequency: z.enum(['none', 'sporadic', 'monthly', 'bi-weekly', 'weekly']).describe('Estimated frequency of press releases'),
  analysis: z.string().describe('Overall assessment of press release strategy')
});

type PressReleaseAnalysis = z.infer<typeof PressReleaseAnalysisSchema>;

@Injectable()
export class PressReleaseRule extends BaseAEORule {
  private readonly logger = new Logger(PressReleaseRule.name);
  
  // Scoring values
  private static readonly SCORE_EXCELLENT = 100; // Recent + Regular + Major outlets
  private static readonly SCORE_GOOD = 80;      // Recent + Some major outlets
  private static readonly SCORE_MODERATE = 60;  // Some recent activity
  private static readonly SCORE_POOR = 40;      // Old/sporadic activity
  private static readonly SCORE_NOT_PRESENT = 20; // No press releases found
  
  // LLM configuration
  private static readonly LLM_TEMPERATURE = 0.3;
  private static readonly LLM_MAX_TOKENS = 3000;
  
  // Provider chain - Perplexity for web search, then fallbacks
  private static readonly LLM_PROVIDERS: Array<{ provider: LlmProvider; model: string }> = [
    { provider: LlmProvider.Perplexity, model: 'sonar-pro' }, // Primary for web search
    { provider: LlmProvider.Perplexity, model: 'sonar' }, // Fallback
    { provider: LlmProvider.OpenAI, model: 'gpt-4o-mini' }, // Secondary fallback
  ];
  
  constructor(
    private readonly llmService: LlmService
  ) {
    super(
      'press-release-distribution',
      'Press Release Distribution',
      'AUTHORITY',
      {
        impactScore: 2, // Medium impact
        pageTypes: [], // Off-site rule
        isDomainLevel: true // Domain-level analysis
      }
    );
  }
  
  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    const scoreBreakdown: { component: string; points: number }[] = [];
    let score = 0;
    
    // Extract brand name from URL
    const brandName = this.extractBrandName(url);
    const currentYear = new Date().getFullYear();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    // Create web search prompt
    const prompt = `Search for press releases from "${brandName}" brand/company using multiple queries:

1. Search on PR distribution platforms:
   - site:prnewswire.com "${brandName}" after:${currentYear - 1}
   - site:businesswire.com "${brandName}"
   - site:prweb.com "${brandName}"
   - site:globenewswire.com "${brandName}"

2. Search for company news section:
   - "${brandName}" "press release" OR "news" OR "media"
   - site:${new URL(url).hostname} "press" OR "news" OR "media"

3. Search for recent press releases:
   - "${brandName}" "press release" ${currentYear}
   - "${brandName}" announcement ${currentYear}

Analyze and extract:
- All press releases found (title, URL, date, platform)
- Whether company has dedicated news/press section
- Distribution frequency pattern
- Use of major PR platforms

Return structured data following the schema provided.`;

    let llmResponse: PressReleaseAnalysis | null = null;
    let successfulProvider: string | null = null;
    let lastError: Error | null = null;
    
    try {
      // Try providers in order
      for (const { provider, model } of PressReleaseRule.LLM_PROVIDERS) {
        try {
          if (this.llmService.isProviderAvailable(provider)) {
            llmResponse = await this.llmService.getStructuredOutput(
              provider,
              prompt,
              PressReleaseAnalysisSchema,
              { 
                model,
                temperature: PressReleaseRule.LLM_TEMPERATURE,
                maxTokens: PressReleaseRule.LLM_MAX_TOKENS,
                webAccess: true // Enable web access
              }
            );
            successfulProvider = `${provider}/${model}`;
            this.logger.log(`PressReleaseRule: Successfully used ${successfulProvider} for analysis`);
            break;
          }
        } catch (error) {
          this.logger.error(`PressReleaseRule: Provider ${provider}/${model} failed:`, error);
          lastError = new Error(`${provider}/${model} failed: ${error.message}`);
          continue;
        }
      }
      
      if (!llmResponse) {
        throw lastError || new Error('All LLM providers failed to analyze press releases');
      }
      
      // Process results and calculate score
      const totalCount = llmResponse.totalCount;
      const recentCount = llmResponse.recentCount;
      const hasMajorOutlets = llmResponse.majorOutlets.some(outlet => 
        ['PRNewswire', 'BusinessWire', 'PR Web', 'GlobeNewswire'].some(major => 
          outlet.toLowerCase().includes(major.toLowerCase())
        )
      );
      
      // Score calculation
      scoreBreakdown.push({ component: 'Base score', points: 0 });
      
      // Recent press releases (40 points)
      if (recentCount >= 3) {
        score += 40;
        scoreBreakdown.push({ component: 'Recent PRs (3+ in last 3 months)', points: 40 });
        evidence.push(EvidenceHelper.success(PressReleaseTopic.RECENCY, `${recentCount} recent press releases in last 3 months`, {
          score: 40,
          maxScore: 40,
          target: '3+ recent PRs for maximum recency score'
        }));
      } else if (recentCount >= 1) {
        score += 20;
        scoreBreakdown.push({ component: 'Some recent PRs', points: 20 });
        evidence.push(EvidenceHelper.warning(PressReleaseTopic.RECENCY, `Only ${recentCount} recent press release(s) in last 3 months`, {
          score: 20,
          maxScore: 40,
          target: 'Aim for 3+ recent PRs for +20 points'
        }));
      } else {
        evidence.push(EvidenceHelper.error(PressReleaseTopic.RECENCY, 'No recent press releases in last 3 months', {
          score: 0,
          maxScore: 40,
          target: 'Issue regular press releases for +40 points'
        }));
      }
      
      // Regular cadence (30 points)
      if (llmResponse.distributionFrequency === 'monthly' || llmResponse.distributionFrequency === 'bi-weekly' || llmResponse.distributionFrequency === 'weekly') {
        score += 30;
        scoreBreakdown.push({ component: 'Regular distribution cadence', points: 30 });
        evidence.push(EvidenceHelper.success(PressReleaseTopic.FREQUENCY, `${llmResponse.distributionFrequency} press release distribution`, {
          score: 30,
          maxScore: 30,
          target: 'Monthly or better cadence'
        }));
      } else if (llmResponse.distributionFrequency === 'sporadic') {
        score += 15;
        scoreBreakdown.push({ component: 'Sporadic distribution', points: 15 });
        evidence.push(EvidenceHelper.warning(PressReleaseTopic.FREQUENCY, 'Sporadic press release distribution', {
          score: 15,
          maxScore: 30,
          target: 'Establish monthly cadence for +15 points'
        }));
      } else {
        evidence.push(EvidenceHelper.error(PressReleaseTopic.FREQUENCY, 'No consistent distribution pattern', {
          score: 0,
          maxScore: 30,
          target: 'Establish regular PR cadence for +30 points'
        }));
      }
      
      // Major outlet distribution (30 points)
      if (hasMajorOutlets) {
        score += 30;
        scoreBreakdown.push({ component: 'Major outlet distribution', points: 30 });
        evidence.push(EvidenceHelper.success(PressReleaseTopic.PLATFORM_COVERAGE, `Uses major platforms: ${llmResponse.majorOutlets.join(', ')}`, {
          score: 30,
          maxScore: 30,
          target: 'Major PR distribution platforms'
        }));
      } else if (llmResponse.hasCompanyNewsSection) {
        score += 10;
        scoreBreakdown.push({ component: 'Company news section only', points: 10 });
        evidence.push(EvidenceHelper.warning(PressReleaseTopic.PLATFORM_COVERAGE, 'Press releases only on company website', {
          score: 10,
          maxScore: 30,
          target: 'Use major PR platforms for +20 points'
        }));
      } else {
        evidence.push(EvidenceHelper.error(PressReleaseTopic.PLATFORM_COVERAGE, 'No major PR platform distribution', {
          score: 0,
          maxScore: 30,
          target: 'Distribute via PRNewswire/BusinessWire for +30 points'
        }));
      }
      
      // Company news section bonus
      if (llmResponse.hasCompanyNewsSection) {
        evidence.push(EvidenceHelper.success(PressReleaseTopic.COMPANY_NEWS, 'Has dedicated news/press section on website', {
          target: 'Centralizes press information'
        }));
      } else {
        evidence.push(EvidenceHelper.warning(PressReleaseTopic.COMPANY_NEWS, 'No dedicated news/press section found', {
          target: 'Create /news or /press section'
        }));
        recommendations.push('Create a dedicated news/press section on your website');
      }
      
      // List found press releases
      if (llmResponse.pressReleases.length > 0) {
        evidence.push(EvidenceHelper.info(PressReleaseTopic.PRESS_RELEASES_FOUND, `Found ${totalCount} press releases:`));
        llmResponse.pressReleases.slice(0, 5).forEach((pr, index) => {
          evidence.push(EvidenceHelper.info(PressReleaseTopic.PRESS_RELEASES_FOUND, 
            `  ${index + 1}. ${pr.title} (${pr.platform}, ${pr.date})`
          ));
        });
        if (llmResponse.pressReleases.length > 5) {
          evidence.push(EvidenceHelper.info(PressReleaseTopic.PRESS_RELEASES_FOUND, `  ... and ${llmResponse.pressReleases.length - 5} more`));
        }
      }
      
      // Build recommendations
      if (score < 100) {
        if (recentCount < 3) {
          recommendations.push('Increase press release frequency to at least monthly');
        }
        if (!hasMajorOutlets) {
          recommendations.push('Distribute press releases through major platforms like PRNewswire or BusinessWire');
        }
        if (llmResponse.distributionFrequency === 'sporadic' || llmResponse.distributionFrequency === 'none') {
          recommendations.push('Establish a regular press release calendar with consistent monthly distribution');
        }
      }
      
      // Add analysis summary
      evidence.push(EvidenceHelper.info(PressReleaseTopic.DISTRIBUTION_QUALITY, llmResponse.analysis));
      
    } catch (error) {
      // If web search fails, return error state
      evidence.push(EvidenceHelper.error(PressReleaseTopic.PRESS_RELEASES_FOUND, `Failed to analyze press releases: ${error.message}`));
      score = 0;
      recommendations.push('Manual assessment needed - automated analysis failed');
    }
    
    // Add score calculation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    // Capture AI usage information
    const aiUsage = successfulProvider ? {
      modelName: successfulProvider,
      prompt: prompt.substring(0, 500) + '...', // Truncate for storage
      response: llmResponse ? JSON.stringify(llmResponse, null, 2).substring(0, 1000) + '...' : 'No response'
    } : undefined;
    
    return this.createResult(score, evidence, undefined, {
      criteria: 'Authority Building',
      element: 'Press Release Distribution',
      applicationLevel: 'Off-Site',
      seoLlmType: 'SEO adapted to LLM',
      impact: 'Medium',
      importance: 'Strategic press release distribution builds media coverage and brand authority through news mentions.',
    }, recommendations, aiUsage);
  }
  
  private extractBrandName(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      // Remove www prefix
      let brand = hostname.replace(/^www\./, '');
      
      // Remove common TLDs - handle country codes like .fr, .de, .uk
      brand = brand.replace(/\.(com|org|net|io|co|ai|app|dev|fr|de|uk|es|it|nl|be|ch|at)$/i, '');
      
      // If there are still dots, take the first part (main domain)
      // e.g., "subdomain.pretto" -> "subdomain", "pretto" -> "pretto"
      const parts = brand.split('.');
      brand = parts.length > 1 ? parts[0] : brand;
      
      // Capitalize first letter
      return brand.charAt(0).toUpperCase() + brand.slice(1);
    } catch {
      return 'the company';
    }
  }
}