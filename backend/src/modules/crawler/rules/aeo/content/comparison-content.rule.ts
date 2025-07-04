import { Injectable, Logger } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { LlmService } from '../../../../llm/services/llm.service';
import { LlmProvider } from '../../../../llm/interfaces/llm-provider.enum';
import { z } from 'zod';
import { PageCategoryType } from '../../../interfaces/page-category.interface';

// Zod schema for structured output
const ComparisonItemSchema = z.object({
  name: z.string().describe('The name of the product/service/solution being compared'),
  category: z.string().describe('The category or type (e.g., "competitor", "alternative solution", "internal product")'),
  excerpt: z.string().describe('A direct quote from the content (50-150 chars) showing how this item is described or compared'),
  prosFound: z.array(z.string()).describe('List of advantages/pros/benefits mentioned for this item'),
  consFound: z.array(z.string()).describe('List of disadvantages/cons/drawbacks mentioned for this item'),
  keyFeatures: z.array(z.string()).describe('Key features or characteristics highlighted')
});

const ComparisonAnalysisSchema = z.object({
  comparisonItems: z.array(ComparisonItemSchema).describe('All items being compared in the content'),
  hasComparisonTable: z.boolean().describe('Whether the page contains a structured comparison table'),
  hasProsCons: z.boolean().describe('Whether the page uses pros/cons lists'),
  hasBulletedLists: z.boolean().describe('Whether comparisons use bullet points or numbered lists'),
  comparisonDepth: z.enum(['surface', 'moderate', 'detailed']).describe('How thorough the comparison is'),
  fairnessLevel: z.enum(['biased', 'somewhat_fair', 'balanced']).describe('How balanced/fair the comparison appears'),
  hasItemListSchema: z.boolean().describe('Whether ItemList or Product schema markup is detected'),
  hasInternalLinks: z.boolean().describe('Whether there are internal links to alternatives'),
  lastUpdated: z.string().nullable().optional().describe('When the comparison was last updated if mentioned'),
  analysis: z.string().describe('Overall assessment of the comparison quality')
});

type ComparisonAnalysis = z.infer<typeof ComparisonAnalysisSchema>;

@Injectable()
export class ComparisonContentRule extends BaseAEORule {
  private readonly logger = new Logger(ComparisonContentRule.name);
  
  // Scoring thresholds for comparison items
  private static readonly MIN_COMPARISON_ITEMS_EXCELLENT = 2;
  private static readonly MIN_COMPARISON_ITEMS_GOOD = 2;
  private static readonly MIN_COMPARISON_ITEMS_MODERATE = 1;
  
  // Scoring values
  private static readonly SCORE_EXCELLENT = 100; // Comparison with table + schema + internal links
  private static readonly SCORE_GOOD = 80;       // Comparison with structured format (table OR pros/cons OR lists)
  private static readonly SCORE_MODERATE = 60;   // Comparison present but narrative only
  private static readonly SCORE_POOR = 40;       // Limited comparison (only 1 item)
  private static readonly SCORE_NOT_PRESENT = 20; // No comparison content
  
  // Content analysis limits
  private static readonly MAX_CONTENT_LENGTH = 20000;
  private static readonly MIN_CONTENT_LENGTH = 100;
  
  // LLM configuration
  private static readonly LLM_TEMPERATURE = 0.3;
  private static readonly LLM_MAX_TOKENS = 2500;
  
  // Provider chain - OpenAI mini as primary per user request
  private static readonly LLM_PROVIDERS: Array<{ provider: LlmProvider; model: string }> = [
    { provider: LlmProvider.OpenAI, model: 'gpt-4o-mini' }, // Primary model (user preference)
    { provider: LlmProvider.OpenAI, model: 'gpt-4o' }, // Fallback
    { provider: LlmProvider.Anthropic, model: 'claude-3-haiku-20240307' }, // Secondary fallback
  ];
  
  constructor(
    private readonly llmService: LlmService
  ) {
    super(
      'comparison_content',
      'Comparison Content',
      'CONTENT' as Category,
      {
        impactScore: 3,
        pageTypes: [PageCategoryType.COMPARISON_PAGE, PageCategoryType.BLOG_POST_ARTICLE, PageCategoryType.IN_DEPTH_GUIDE_WHITE_PAPER],
        isDomainLevel: false
      }
    );
  }

  private isComparisonUrl(url: string): boolean {
    return /(?:vs|versus|compare|comparison|difference|alternative)/i.test(url);
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    const scoreBreakdown: { component: string; points: number }[] = [];
    let score = 0;
    
    const cleanText = content.cleanContent || '';
    const html = content.html || '';
    
    // Quick check if this is likely a comparison page
    const isComparisonPage = this.isComparisonUrl(url);
    if (isComparisonPage) {
      evidence.push(EvidenceHelper.success('URL indicates comparison content', { target: 'guidance' }));
    }
    
    // Prepare content for LLM analysis
    const contentForAnalysis = cleanText.substring(0, ComparisonContentRule.MAX_CONTENT_LENGTH);
    
    // Validate content
    if (!contentForAnalysis || contentForAnalysis.trim().length < ComparisonContentRule.MIN_CONTENT_LENGTH) {
      evidence.push(EvidenceHelper.error('Insufficient content to analyze for comparisons'));
      return this.createResult(ComparisonContentRule.SCORE_NOT_PRESENT, evidence, [], {}, recommendations);
    }
    
    // Check LLM availability
    if (!this.llmService) {
      throw new Error('LlmService is required for ComparisonContentRule evaluation');
    }
    
    // Declare variables outside try-catch for scope access
    let llmResponse: ComparisonAnalysis;
    let successfulProvider: string | null = null;
    let lastError: Error | null = null;
    
    // Enhanced prompt for comparison analysis
    const prompt = `Analyze the provided website content to identify and evaluate comparison content.

IMPORTANT DEFINITIONS:
- Comparison Content: Content that directly compares products, services, or solutions (using "vs", "versus", "compare", "alternative to")
- NOT Comparison: General feature lists, single product descriptions, or mentions without actual comparison

EVALUATION CRITERIA:
1. **Comparison Structure**:
   - TABLE: Structured comparison table with rows/columns
   - PROS/CONS: Clear lists of advantages and disadvantages
   - BULLETED: Bullet points or numbered lists comparing features
   - NARRATIVE: Text-based comparison without structure

2. **Comparison Depth**:
   - DETAILED: Comprehensive comparison with multiple criteria, metrics, use cases
   - MODERATE: Covers main features and differences
   - SURFACE: Basic comparison with limited criteria

3. **Fairness Level**:
   - BALANCED: Fair presentation of strengths/weaknesses for all items
   - SOMEWHAT_FAIR: Mostly fair with slight bias
   - BIASED: Heavily favors one option

IMPORTANT: For each comparison item found, you MUST provide:
- An exact excerpt showing how it's described in the content
- List specific pros and cons mentioned
- Key features or characteristics highlighted

Analyze for:
1. Products/services being compared
2. Comparison tables or structured formats
3. Pros/cons lists
4. Internal links to alternatives
5. Schema markup (ItemList, Product)
6. Update dates or freshness indicators

URL: ${url}

Website Content:
${contentForAnalysis}

HTML (for structure detection):
${html.substring(0, 5000)}`;

    try {
      // Try providers in order
      
      for (const { provider, model } of ComparisonContentRule.LLM_PROVIDERS) {
        try {
          if (this.llmService.isProviderAvailable(provider)) {
            llmResponse = await this.llmService.getStructuredOutput(
              provider,
              prompt,
              ComparisonAnalysisSchema,
              { 
                model,
                temperature: ComparisonContentRule.LLM_TEMPERATURE,
                maxTokens: ComparisonContentRule.LLM_MAX_TOKENS
              }
            );
            successfulProvider = `${provider}/${model}`;
            this.logger.log(`ComparisonContentRule: Successfully used ${successfulProvider} for analysis`);
            break;
          }
        } catch (error) {
          this.logger.error(`ComparisonContentRule: Provider ${provider}/${model} failed:`, error);
          lastError = new Error(`${provider}/${model} failed: ${error.message}`);
          continue;
        }
      }
      
      if (!llmResponse!) {
        throw lastError || new Error('All LLM providers failed to analyze comparison content');
      }
      
      // Process results
      const itemCount = llmResponse.comparisonItems.length;
      const hasStructure = llmResponse.hasComparisonTable || llmResponse.hasProsCons || llmResponse.hasBulletedLists;
      const hasAdvancedFeatures = llmResponse.hasItemListSchema && llmResponse.hasInternalLinks;
      
      // Score based on the quality of this comparison page
      if (itemCount >= 2) {
        if (hasAdvancedFeatures && llmResponse.hasComparisonTable) {
          score = ComparisonContentRule.SCORE_EXCELLENT;
          scoreBreakdown.push({ component: 'Base score', points: 100 });
          evidence.push(EvidenceHelper.success('Excellent comparison page with table, schema markup, and internal links', { 
            score: score,
            target: 'Comprehensive comparison with all best practices'
          }));
        } else if (hasStructure) {
          score = ComparisonContentRule.SCORE_GOOD;
          scoreBreakdown.push({ component: 'Base score', points: 100 });
          scoreBreakdown.push({ component: 'Missing advanced features', points: -20 });
          evidence.push(EvidenceHelper.success(`Well-structured comparison with ${hasStructure ? 'organized format' : 'narrative'}`, { 
            score: score,
            target: 'Add comparison table + schema + internal links for 100/100'
          }));
          // Add what's missing for excellent score
          const missingFeatures = [];
          if (!llmResponse.hasComparisonTable) missingFeatures.push('comparison table');
          if (!llmResponse.hasItemListSchema) missingFeatures.push('schema markup');
          if (!llmResponse.hasInternalLinks) missingFeatures.push('internal links');
          if (missingFeatures.length > 0) {
            recommendations.push(`Add ${missingFeatures.join(', ')} to achieve excellent score (100/100)`);
          }
        } else {
          score = ComparisonContentRule.SCORE_MODERATE;
          scoreBreakdown.push({ component: 'Base score', points: 100 });
          scoreBreakdown.push({ component: 'No structured format', points: -40 });
          evidence.push(EvidenceHelper.warning('Comparison content present but lacks structured format', { 
            score: score,
            target: 'Add table, pros/cons lists, or bullet points for 80/100'
          }));
        }
      } else if (itemCount === 1) {
        score = ComparisonContentRule.SCORE_POOR;
        scoreBreakdown.push({ component: 'Base score', points: 100 });
        scoreBreakdown.push({ component: 'Only one item compared', points: -60 });
        evidence.push(EvidenceHelper.warning('Limited comparison - only one item analyzed', { 
          score: score,
          target: 'Compare at least 2 items for proper comparison'
        }));
      } else {
        score = ComparisonContentRule.SCORE_NOT_PRESENT;
        scoreBreakdown.push({ component: 'Base score', points: 100 });
        scoreBreakdown.push({ component: 'No comparison content', points: -80 });
        evidence.push(EvidenceHelper.error('No clear comparison content found', { 
          score: score,
          target: 'Add comparison content with 2+ items'
        }));
      }
      
      // Detailed structure assessment
      if (llmResponse.hasComparisonTable) {
        evidence.push(EvidenceHelper.success('Contains comparison table for easy scanning', { 
          target: 'Essential for excellent comparison'
        }));
      }
      if (llmResponse.hasProsCons) {
        evidence.push(EvidenceHelper.success('Uses pros/cons lists for clarity', { 
          target: 'Helps readers make informed decisions'
        }));
      }
      if (llmResponse.hasBulletedLists) {
        evidence.push(EvidenceHelper.success('Features bulleted lists for readability', { 
          target: 'Improves scannability and comprehension'
        }));
      }
      if (!hasStructure && itemCount > 0) {
        evidence.push(EvidenceHelper.warning('Comparison is narrative-only ("wall of text")', {
          target: 'Add structured format for better readability'
        }));
      }
      
      // Fairness assessment
      evidence.push(EvidenceHelper.info(`Comparison fairness: ${llmResponse.fairnessLevel.replace('_', ' ')}`, {
        target: 'Aim for balanced comparison'
      }));
      if (llmResponse.fairnessLevel === 'biased') {
        score = Math.max(ComparisonContentRule.SCORE_POOR, score - 20);
        scoreBreakdown.push({ component: 'Biased comparison', points: -20 });
        evidence.push(EvidenceHelper.warning('Comparison appears heavily biased', {
          score: -20,
          target: 'Present balanced pros/cons for all items'
        }));
        recommendations.push('Present a more balanced view of all options to improve credibility');
      }
      
      // Depth assessment
      evidence.push(EvidenceHelper.info(`Comparison depth: ${llmResponse.comparisonDepth}`, {
        target: 'Detailed comparisons provide more value'
      }));
      
      // Schema and technical features
      if (llmResponse.hasItemListSchema) {
        evidence.push(EvidenceHelper.success('Uses ItemList/Product schema markup', { 
          target: 'Helps search engines understand comparisons'
        }));
      }
      if (llmResponse.hasInternalLinks) {
        evidence.push(EvidenceHelper.success('Includes internal links to alternatives', { 
          target: 'Improves navigation and SEO'
        }));
      }
      
      // Freshness
      if (llmResponse.lastUpdated) {
        evidence.push(EvidenceHelper.info(`Last updated: ${llmResponse.lastUpdated}`, {
          target: 'Keep comparisons current'
        }));
      }
      
      // List items being compared
      if (itemCount > 0) {
        evidence.push(EvidenceHelper.info('Items compared:'));
        llmResponse.comparisonItems.forEach((item, index) => {
          evidence.push(EvidenceHelper.info(`  ${index + 1}. ${item.name} (${item.category})`));
          if (item.excerpt) {
            evidence.push(EvidenceHelper.info(`     📝 "${item.excerpt}"`));
          }
          if (item.prosFound.length > 0) {
            evidence.push(EvidenceHelper.info(`Pros: ${item.prosFound.slice(0, 2).join(', ')}${item.prosFound.length > 2 ? '...' : ''}`));
          }
          if (item.consFound.length > 0) {
            evidence.push(EvidenceHelper.info(`Cons: ${item.consFound.slice(0, 2).join(', ')}${item.consFound.length > 2 ? '...' : ''}`));
          }
        });
      }
      
      // Build recommendations based on missing features
      if (score < ComparisonContentRule.SCORE_EXCELLENT) {
        if (score >= ComparisonContentRule.SCORE_GOOD) {
          // Already have structure, need advanced features
          if (!llmResponse.hasComparisonTable && !recommendations.some(r => r.includes('comparison table'))) {
            recommendations.push('Add a comparison table for easy visual scanning');
          }
          if (!llmResponse.hasItemListSchema && !recommendations.some(r => r.includes('schema markup'))) {
            recommendations.push('Add ItemList or Product schema markup for better search visibility');
          }
          if (!llmResponse.hasInternalLinks && !recommendations.some(r => r.includes('internal links'))) {
            recommendations.push('Add internal links to each alternative for better navigation');
          }
        } else {
          // Need basic improvements first
          if (!llmResponse.hasComparisonTable && !llmResponse.hasProsCons && !llmResponse.hasBulletedLists) {
            recommendations.push('Add structured format: comparison table, pros/cons lists, or bullet points for better readability');
          }
          if (itemCount < 2) {
            recommendations.push('Compare at least 2 items for a proper comparison');
          }
          if (!llmResponse.lastUpdated) {
            recommendations.push('Include last updated date for credibility');
          }
        }
      }
      
    } catch (error) {
      throw new Error(`Failed to analyze comparison content: ${error.message}`);
    }
    
    // Add proper score calculation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    // Capture AI usage information
    const aiUsage = successfulProvider ? {
      modelName: successfulProvider,
      prompt: prompt.substring(0, 500) + '...', // Truncate for storage
      response: JSON.stringify(llmResponse!, null, 2).substring(0, 1000) + '...' // Truncate response
    } : undefined;
    
    return this.createResult(score, evidence, [], {}, recommendations, aiUsage);
  }
}