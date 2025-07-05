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
enum IndustryPublicationsTopic {
  PUBLICATIONS_FOUND = 'Publications Found',
  THOUGHT_LEADERSHIP = 'Thought Leadership',
  MENTION_QUALITY = 'Mention Quality',
  RECENCY = 'Recency',
  PUBLICATION_AUTHORITY = 'Publication Authority',
  COVERAGE_BREADTH = 'Coverage Breadth'
}

// Zod schema for structured output
const PublicationMentionSchema = z.object({
  title: z.string().describe('Title of the article'),
  url: z.string().describe('URL of the article'),
  publication: z.string().describe('Name of the publication (e.g., Forbes, TechCrunch)'),
  date: z.string().nullable().describe('Publication date if available (YYYY-MM-DD format)'),
  type: z.enum(['mention', 'quote', 'feature', 'thought_leadership', 'interview', 'guest_post']).describe('Type of coverage'),
  authorQuoted: z.string().nullable().describe('Name of company representative quoted if applicable'),
  excerpt: z.string().describe('Brief excerpt showing how brand is mentioned (50-200 chars)')
});

const IndustryPublicationAnalysisSchema = z.object({
  publications: z.array(PublicationMentionSchema).describe('List of industry publication mentions found'),
  topPublications: z.array(z.string()).describe('List of top-tier publications where brand appears'),
  thoughtLeadershipCount: z.number().describe('Number of thought leadership articles (guest posts, interviews, features)'),
  totalMentions: z.number().describe('Total number of mentions across all publications'),
  recentMentions: z.number().describe('Number of mentions from last 6 months'),
  industryIdentified: z.string().describe('Primary industry identified for the brand'),
  authorityPublications: z.array(z.string()).describe('High-authority publications (Forbes, WSJ, etc.) where brand appears'),
  analysis: z.string().describe('Overall assessment of industry publication presence')
});

type IndustryPublicationAnalysis = z.infer<typeof IndustryPublicationAnalysisSchema>;

@Injectable()
export class IndustryPublicationsRule extends BaseAEORule {
  private readonly logger = new Logger(IndustryPublicationsRule.name);
  
  // Scoring values
  private static readonly SCORE_EXCELLENT = 100; // 5+ mentions + thought leadership + recent
  private static readonly SCORE_GOOD = 80;      // 3-4 mentions + some thought leadership
  private static readonly SCORE_MODERATE = 60;  // 1-2 mentions
  private static readonly SCORE_POOR = 40;      // Mentions but old/low quality
  private static readonly SCORE_NOT_PRESENT = 20; // No industry publications found
  
  // LLM configuration
  private static readonly LLM_TEMPERATURE = 0.3;
  private static readonly LLM_MAX_TOKENS = 3000;
  
  // Provider chain - Perplexity for web search
  private static readonly LLM_PROVIDERS: Array<{ provider: LlmProvider; model: string }> = [
    { provider: LlmProvider.Perplexity, model: 'sonar-pro' }, // Primary for web search
    { provider: LlmProvider.Perplexity, model: 'sonar' }, // Fallback
    { provider: LlmProvider.OpenAI, model: 'gpt-4o-mini' }, // Secondary fallback
  ];
  
  // High-authority publications
  private static readonly AUTHORITY_PUBLICATIONS = [
    'Forbes', 'Wall Street Journal', 'Financial Times', 'The Economist',
    'Harvard Business Review', 'MIT Technology Review', 'Wired',
    'TechCrunch', 'VentureBeat', 'Business Insider', 'Fast Company',
    'Inc.', 'Entrepreneur', 'Fortune', 'Bloomberg', 'Reuters'
  ];
  
  constructor(
    private readonly llmService: LlmService
  ) {
    super(
      'industry-publication-contributions',
      'Industry Publication Contributions',
      'AUTHORITY',
      {
        impactScore: 3, // High impact
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
    
    // Extract brand name and company info
    const brandName = this.extractBrandName(url);
    const currentYear = new Date().getFullYear();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // Create comprehensive web search prompt
    const prompt = `Search for "${brandName}" brand/company mentions in industry publications:

1. Search major business/tech publications:
   - site:forbes.com "${brandName}"
   - site:techcrunch.com "${brandName}"
   - site:businessinsider.com "${brandName}"
   - site:wsj.com "${brandName}"
   - site:bloomberg.com "${brandName}"
   - site:reuters.com "${brandName}"
   - site:fastcompany.com "${brandName}"
   - site:inc.com "${brandName}"
   - site:entrepreneur.com "${brandName}"
   - site:wired.com "${brandName}"

2. Search for thought leadership and features:
   - "${brandName}" CEO interview ${currentYear}
   - "${brandName}" guest post OR "by [company executive]"
   - "${brandName}" thought leadership
   - "${brandName}" industry expert

3. Identify the brand's primary industry, then search industry-specific publications:
   - "${brandName}" [industry] publication
   - "${brandName}" [industry] magazine
   - "${brandName}" trade journal

Analyze and extract:
- All mentions in recognized publications (title, URL, date, type)
- Whether mentions are simple references, quotes, features, or thought leadership
- Names of company representatives quoted
- Publication authority level
- Industry focus

Focus on substantive mentions, not just passing references.
Return structured data following the schema provided.`;

    let llmResponse: IndustryPublicationAnalysis | null = null;
    let successfulProvider: string | null = null;
    let lastError: Error | null = null;
    
    try {
      // Try providers in order
      for (const { provider, model } of IndustryPublicationsRule.LLM_PROVIDERS) {
        try {
          if (this.llmService.isProviderAvailable(provider)) {
            llmResponse = await this.llmService.getStructuredOutput(
              provider,
              prompt,
              IndustryPublicationAnalysisSchema,
              { 
                model,
                temperature: IndustryPublicationsRule.LLM_TEMPERATURE,
                maxTokens: IndustryPublicationsRule.LLM_MAX_TOKENS,
                webAccess: true // Enable web access
              }
            );
            successfulProvider = `${provider}/${model}`;
            this.logger.log(`IndustryPublicationsRule: Successfully used ${successfulProvider} for analysis`);
            break;
          }
        } catch (error) {
          this.logger.error(`IndustryPublicationsRule: Provider ${provider}/${model} failed:`, error);
          lastError = new Error(`${provider}/${model} failed: ${error.message}`);
          continue;
        }
      }
      
      if (!llmResponse) {
        throw lastError || new Error('All LLM providers failed to analyze industry publications');
      }
      
      // Process results and calculate score
      const totalMentions = llmResponse.totalMentions;
      const thoughtLeadershipCount = llmResponse.thoughtLeadershipCount;
      const recentMentions = llmResponse.recentMentions;
      const hasAuthorityPubs = llmResponse.authorityPublications.length > 0;
      
      // Score calculation
      
      // Mention quantity (40 points)
      if (totalMentions >= 5) {
        score += 40;
        scoreBreakdown.push({ component: '5+ industry mentions', points: 40 });
        evidence.push(EvidenceHelper.success(IndustryPublicationsTopic.PUBLICATIONS_FOUND, `Found ${totalMentions} mentions in industry publications`, {
          score: 40,
          maxScore: 40,
          target: '5+ mentions for maximum score'
        }));
      } else if (totalMentions >= 3) {
        score += 30;
        scoreBreakdown.push({ component: '3-4 industry mentions', points: 30 });
        evidence.push(EvidenceHelper.success(IndustryPublicationsTopic.PUBLICATIONS_FOUND, `Found ${totalMentions} mentions in industry publications`, {
          score: 30,
          maxScore: 40,
          target: 'Aim for 5+ mentions for +10 points'
        }));
      } else if (totalMentions >= 1) {
        score += 20;
        scoreBreakdown.push({ component: '1-2 industry mentions', points: 20 });
        evidence.push(EvidenceHelper.warning(IndustryPublicationsTopic.PUBLICATIONS_FOUND, `Only ${totalMentions} mention(s) in industry publications`, {
          score: 20,
          maxScore: 40,
          target: 'Aim for 5+ mentions for +20 points'
        }));
      } else {
        evidence.push(EvidenceHelper.error(IndustryPublicationsTopic.PUBLICATIONS_FOUND, 'No mentions found in industry publications', {
          score: 0,
          maxScore: 40,
          target: 'Get featured in industry publications for +40 points'
        }));
      }
      
      // Thought leadership (30 points)
      if (thoughtLeadershipCount >= 3) {
        score += 30;
        scoreBreakdown.push({ component: '3+ thought leadership pieces', points: 30 });
        evidence.push(EvidenceHelper.success(IndustryPublicationsTopic.THOUGHT_LEADERSHIP, `${thoughtLeadershipCount} thought leadership articles (guest posts, interviews, features)`, {
          score: 30,
          maxScore: 30,
          target: 'Strong thought leadership presence'
        }));
      } else if (thoughtLeadershipCount >= 1) {
        score += 15;
        scoreBreakdown.push({ component: 'Some thought leadership', points: 15 });
        evidence.push(EvidenceHelper.warning(IndustryPublicationsTopic.THOUGHT_LEADERSHIP, `Only ${thoughtLeadershipCount} thought leadership piece(s)`, {
          score: 15,
          maxScore: 30,
          target: 'Aim for 3+ pieces for +15 points'
        }));
      } else {
        evidence.push(EvidenceHelper.error(IndustryPublicationsTopic.THOUGHT_LEADERSHIP, 'No thought leadership content found', {
          score: 0,
          maxScore: 30,
          target: 'Publish guest posts or interviews for +30 points'
        }));
      }
      
      // Recency (30 points)
      const recentRatio = totalMentions > 0 ? recentMentions / totalMentions : 0;
      if (recentMentions >= 3 && recentRatio >= 0.5) {
        score += 30;
        scoreBreakdown.push({ component: 'Recent coverage (3+ in 6 months)', points: 30 });
        evidence.push(EvidenceHelper.success(IndustryPublicationsTopic.RECENCY, `${recentMentions} recent mentions in last 6 months`, {
          score: 30,
          maxScore: 30,
          target: 'Maintaining current visibility'
        }));
      } else if (recentMentions >= 1) {
        score += 15;
        scoreBreakdown.push({ component: 'Some recent coverage', points: 15 });
        evidence.push(EvidenceHelper.warning(IndustryPublicationsTopic.RECENCY, `Only ${recentMentions} recent mention(s) in last 6 months`, {
          score: 15,
          maxScore: 30,
          target: 'Increase recent coverage for +15 points'
        }));
      } else {
        evidence.push(EvidenceHelper.error(IndustryPublicationsTopic.RECENCY, 'No recent mentions in last 6 months', {
          score: 0,
          maxScore: 30,
          target: 'Get recent coverage for +30 points'
        }));
      }
      
      // Authority publication bonus
      if (hasAuthorityPubs) {
        evidence.push(EvidenceHelper.success(IndustryPublicationsTopic.PUBLICATION_AUTHORITY, 
          `Featured in high-authority publications: ${llmResponse.authorityPublications.join(', ')}`, {
          target: 'Premium publication presence'
        }));
      } else {
        evidence.push(EvidenceHelper.warning(IndustryPublicationsTopic.PUBLICATION_AUTHORITY, 
          'Not featured in top-tier publications (Forbes, WSJ, etc.)', {
          target: 'Target high-authority publications'
        }));
        recommendations.push('Target high-authority publications like Forbes, Wall Street Journal, or TechCrunch');
      }
      
      // Industry identification
      evidence.push(EvidenceHelper.info(IndustryPublicationsTopic.COVERAGE_BREADTH, 
        `Industry identified: ${llmResponse.industryIdentified}`
      ));
      
      // List found publications
      if (llmResponse.publications.length > 0) {
        evidence.push(EvidenceHelper.info(IndustryPublicationsTopic.PUBLICATIONS_FOUND, 'Publications found:'));
        
        // Group by type
        const byType = llmResponse.publications.reduce((acc, pub) => {
          if (!acc[pub.type]) acc[pub.type] = [];
          acc[pub.type].push(pub);
          return acc;
        }, {} as Record<string, typeof llmResponse.publications>);
        
        // Show top items by type
        Object.entries(byType).forEach(([type, pubs]) => {
          evidence.push(EvidenceHelper.info(IndustryPublicationsTopic.MENTION_QUALITY, 
            `  ${type.replace('_', ' ').toUpperCase()} (${pubs.length}):`
          ));
          pubs.slice(0, 2).forEach((pub) => {
            const dateStr = pub.date ? ` - ${pub.date}` : '';
            evidence.push(EvidenceHelper.info(IndustryPublicationsTopic.PUBLICATIONS_FOUND, 
              `    • ${pub.title} (${pub.publication}${dateStr})`
            ));
            if (pub.authorQuoted) {
              evidence.push(EvidenceHelper.info(IndustryPublicationsTopic.PUBLICATIONS_FOUND, 
                `      Quoted: ${pub.authorQuoted}`
              ));
            }
          });
        });
      }
      
      // Build recommendations
      if (score < 100) {
        if (totalMentions < 5) {
          recommendations.push('Increase industry publication presence through PR outreach and media relations');
        }
        if (thoughtLeadershipCount < 3) {
          recommendations.push('Develop thought leadership content: guest posts, expert interviews, and bylined articles');
        }
        if (recentMentions < 3) {
          recommendations.push('Maintain consistent media presence with regular newsworthy announcements');
        }
        if (!hasAuthorityPubs) {
          recommendations.push('Build relationships with journalists at top-tier publications');
        }
      }
      
      // Add analysis summary
      evidence.push(EvidenceHelper.info(IndustryPublicationsTopic.COVERAGE_BREADTH, llmResponse.analysis));
      
    } catch (error) {
      // If web search fails, return error state
      evidence.push(EvidenceHelper.error(IndustryPublicationsTopic.PUBLICATIONS_FOUND, `Failed to analyze industry publications: ${error.message}`));
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
      element: 'Industry Publication Contributions',
      applicationLevel: 'Off-Site',
      seoLlmType: 'SEO adapted to LLM',
      impact: 'High',
      importance: 'Publishing in recognized industry publications establishes thought leadership and expert authority.',
    }, recommendations, aiUsage);
  }
  
  private extractBrandName(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      // Remove common TLDs and www
      const brand = hostname
        .replace(/^www\./, '')
        .replace(/\.(com|org|net|io|co|ai|app|dev)(\.[a-z]{2})?$/i, '')
        .split('.').pop() || hostname;
      
      // Capitalize first letter
      return brand.charAt(0).toUpperCase() + brand.slice(1);
    } catch {
      return 'the company';
    }
  }
}