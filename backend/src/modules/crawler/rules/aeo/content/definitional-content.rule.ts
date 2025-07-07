import { Injectable, Logger } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { LlmService } from '../../../../llm/services/llm.service';
import { LlmProvider } from '../../../../llm/interfaces/llm-provider.enum';
import { z } from 'zod';
import { PageCategoryType } from '../../../interfaces/page-category.interface';


// Evidence topics for this rule
enum DefinitionalContentTopic {
  DEFINITION_ANALYSIS = 'Definition Analysis',
  DEFINITIONS_LIST = 'Definitions List',
  IMPROVEMENT_TIPS = 'Improvement Tips',
  RELATED_TERMS = 'Related Terms',
  NOT_DEFINITIONS_LIST = 'Definitions List',
  SCHEMA_MARKUP = 'Schema Markup',
  SEMANTIC_MARKUP = 'Semantic Markup',
  NO_DEFINITIONS = 'No Definitions'
}

// Zod schema for structured output
const DefinitionSchema = z.object({
  term: z.string().describe('The term or concept being defined'),
  definition: z.string().describe('The main definition provided'),
  excerpt: z.string().describe('A direct quote from the content (50-150 chars) showing the definition'),
  isDirectDefinition: z.boolean().describe('Whether this is a clear, direct definition (starts with "X is..." or similar)'),
  hasExamples: z.boolean().describe('Whether examples are provided to illustrate the concept'),
  hasRelatedTerms: z.boolean().describe('Whether related terms or concepts are mentioned'),
  hasEtymology: z.boolean().describe('Whether the origin or etymology of the term is explained'),
  definitionClarity: z.enum(['clear', 'moderate', 'vague']).describe('How clear and concise the definition is'),
  definitionCompleteness: z.enum(['comprehensive', 'adequate', 'basic']).describe('How thorough the definition is')
});

const DefinitionalAnalysisSchema = z.object({
  definitions: z.array(DefinitionSchema).describe('All definitions found in the content'),
  pageType: z.enum(['dedicated_definition', 'glossary', 'mixed_content', 'non_definitional']).describe('The type of definitional content'),
  hasStructuredMarkup: z.boolean().describe('Whether the page uses definition lists (dl/dt/dd) or semantic markup'),
  hasSchemaMarkup: z.boolean().describe('Whether DefinedTerm or similar schema.org markup is present'),
  definitionDensity: z.enum(['high', 'medium', 'low', 'none']).describe('How much of the content is definitional'),
  targetAudience: z.enum(['beginner', 'intermediate', 'expert', 'mixed']).describe('The apparent target audience level'),
  analysis: z.string().describe('Overall assessment of the definitional content quality')
});

type DefinitionalAnalysis = z.infer<typeof DefinitionalAnalysisSchema>;

@Injectable()
export class DefinitionalContentRule extends BaseAEORule {
  private readonly logger = new Logger(DefinitionalContentRule.name);
  
  // Scoring thresholds (based on CSV requirements)
  private static readonly MIN_DEFINITIONS_EXCELLENT = 5; // ≥5 definitional pages
  private static readonly MIN_DEFINITIONS_GOOD = 2;      // 2-4 definitional pages
  private static readonly MIN_DEFINITIONS_POOR = 1;      // 1 definitional page
  
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
  private static readonly LLM_TEMPERATURE = 0.2;
  private static readonly LLM_MAX_TOKENS = 2500;
  
  // Provider chain - OpenAI mini as primary
  private static readonly LLM_PROVIDERS: Array<{ provider: LlmProvider; model: string }> = [
    { provider: LlmProvider.OpenAI, model: 'gpt-4o-mini' }, // Primary model
    { provider: LlmProvider.OpenAI, model: 'gpt-4o' }, // Fallback
    { provider: LlmProvider.Anthropic, model: 'claude-3-haiku-20240307' }, // Secondary fallback
  ];
  
  constructor(
    private readonly llmService: LlmService
  ) {
    super(
      'definitional_content',
      'What is X? Definitional Content',
      'QUALITY' as Category,
      {
        impactScore: 3,
        pageTypes: [PageCategoryType.WHAT_IS_X_DEFINITIONAL_PAGE, PageCategoryType.FAQ_GLOSSARY_PAGES, PageCategoryType.BLOG_POST_ARTICLE],
        isDomainLevel: true
      }
    );
  }

  private isDefinitionalUrl(url: string): boolean {
    return /(?:what[_-]is|definition|glossary|terminology|dictionary)/i.test(url);
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 0;
    const scoreBreakdown: { component: string; points: number }[] = [];
    
    const cleanText = content.cleanContent || '';
    const html = content.html || '';
    
    // Quick check if this is likely a definitional page
    const isDefinitionalPage = this.isDefinitionalUrl(url);
    if (isDefinitionalPage) {
      evidence.push(EvidenceHelper.success(DefinitionalContentTopic.DEFINITION_ANALYSIS, 'URL indicates definitional content', { target: 'URL optimization' }));
    }
    
    // Prepare content for LLM analysis
    const contentForAnalysis = cleanText.substring(0, DefinitionalContentRule.MAX_CONTENT_LENGTH);
    
    // Validate content
    if (!contentForAnalysis || contentForAnalysis.trim().length < DefinitionalContentRule.MIN_CONTENT_LENGTH) {
      evidence.push(EvidenceHelper.error(DefinitionalContentTopic.DEFINITION_ANALYSIS, 'Insufficient content to analyze for definitions'));
      return this.createResult(DefinitionalContentRule.SCORE_NOT_PRESENT, evidence);
    }
    
    // Check LLM availability
    if (!this.llmService) {
      throw new Error('LlmService is required for DefinitionalContentRule evaluation');
    }
    
    // Declare variables outside try-catch for scope access
    let llmResponse: DefinitionalAnalysis;
    let successfulProvider: string | null = null;
    let lastError: Error | null = null;
    
    // Enhanced prompt for definitional analysis
    const prompt = `Analyze the provided website content to identify and evaluate definitional content.

IMPORTANT DEFINITIONS:
- Definitional Content: Content that explicitly defines terms, concepts, or industry jargon ("What is X?" format)
- Direct Definition: Clear statements like "X is...", "X refers to...", "X means..."
- NOT Definitional: General descriptions, feature lists, or mentions without actual definitions

EVALUATION CRITERIA:
1. **Definition Clarity**:
   - CLEAR: Direct, concise definition in first 1-2 sentences
   - MODERATE: Definition present but buried or verbose
   - VAGUE: Unclear or ambiguous definition

2. **Definition Completeness**:
   - COMPREHENSIVE: Includes definition, examples, related terms, context
   - ADEQUATE: Basic definition with some supporting information
   - BASIC: Minimal definition without elaboration

3. **Page Types**:
   - DEDICATED_DEFINITION: "What is X?" pages focused on defining
   - GLOSSARY: Multiple terms defined in list/dictionary format
   - MIXED_CONTENT: Definitions embedded within other content
   - NON_DEFINITIONAL: No clear definitional intent

IMPORTANT: For each definition found, you MUST provide:
- An exact excerpt showing the definition (50-150 characters)
- Whether it's a clear, direct definition
- Supporting elements (examples, etymology, related terms)

Analyze for:
1. "What is X?" patterns and direct definitions
2. Definition lists (dl/dt/dd) or glossary structures
3. Examples and illustrations
4. Related terms and cross-references
5. Schema markup (DefinedTerm, etc.)
6. Target audience level

URL: ${url}

Website Content:
${contentForAnalysis}

HTML (for structure detection):
${html.substring(0, 5000)}`;

    try {
      // Try providers in order
      
      for (const { provider, model } of DefinitionalContentRule.LLM_PROVIDERS) {
        try {
          if (this.llmService.isProviderAvailable(provider)) {
            llmResponse = await this.llmService.getStructuredOutput(
              provider,
              prompt,
              DefinitionalAnalysisSchema,
              { 
                model,
                temperature: DefinitionalContentRule.LLM_TEMPERATURE,
                maxTokens: DefinitionalContentRule.LLM_MAX_TOKENS
              }
            );
            successfulProvider = `${provider}/${model}`;
            this.logger.log(`DefinitionalContentRule: Successfully used ${successfulProvider} for analysis`);
            break;
          }
        } catch (error) {
          this.logger.error(`DefinitionalContentRule: Provider ${provider}/${model} failed:`, error);
          lastError = new Error(`${provider}/${model} failed: ${error.message}`);
          continue;
        }
      }
      
      if (!llmResponse!) {
        throw lastError || new Error('All LLM providers failed to analyze definitional content');
      }
      
      // Process results
      const definitionCount = llmResponse.definitions.length;
      const clearDefinitions = llmResponse.definitions.filter(d => d.isDirectDefinition && d.definitionClarity === 'clear').length;
      const isDedicatedPage = llmResponse.pageType === 'dedicated_definition' || llmResponse.pageType === 'glossary';
      
      // Scoring based on CSV requirements
      // Note: This evaluates a single page. In practice, you'd aggregate across the domain
      if (isDedicatedPage && clearDefinitions >= DefinitionalContentRule.MIN_DEFINITIONS_EXCELLENT) {
        score = DefinitionalContentRule.SCORE_EXCELLENT;
        scoreBreakdown.push({ component: 'Comprehensive definitional content', points: DefinitionalContentRule.SCORE_EXCELLENT });
        evidence.push(EvidenceHelper.success(DefinitionalContentTopic.DEFINITION_ANALYSIS, `Comprehensive definitional page with ${clearDefinitions} clear definitions`, { target: 'Comprehensive definitional content', score: DefinitionalContentRule.SCORE_EXCELLENT, maxScore: 100 }));
      } else if (isDedicatedPage && clearDefinitions >= DefinitionalContentRule.MIN_DEFINITIONS_GOOD) {
        score = DefinitionalContentRule.SCORE_GOOD;
        scoreBreakdown.push({ component: 'Good definitional content', points: DefinitionalContentRule.SCORE_GOOD });
        evidence.push(EvidenceHelper.success(DefinitionalContentTopic.DEFINITION_ANALYSIS, `Good definitional content with ${clearDefinitions} clear definitions`, { target: 'Good definitional content', score: DefinitionalContentRule.SCORE_GOOD, maxScore: 100 }));
      } else if (definitionCount >= DefinitionalContentRule.MIN_DEFINITIONS_POOR) {
        score = DefinitionalContentRule.SCORE_MODERATE;
        scoreBreakdown.push({ component: 'Basic definitional content', points: DefinitionalContentRule.SCORE_MODERATE });
        evidence.push(EvidenceHelper.warning(DefinitionalContentTopic.DEFINITION_ANALYSIS, `Basic definitional content with ${definitionCount} definitions`, { target: 'Improve definition quality', score: DefinitionalContentRule.SCORE_MODERATE, maxScore: 100 }));
      } else if (definitionCount > 0) {
        score = DefinitionalContentRule.SCORE_POOR;
        scoreBreakdown.push({ component: 'Limited definitional content', points: DefinitionalContentRule.SCORE_POOR });
        evidence.push(EvidenceHelper.warning(DefinitionalContentTopic.DEFINITION_ANALYSIS, 'Limited definitional content, mostly buried in other text', { target: 'Create clear definitions', score: DefinitionalContentRule.SCORE_POOR, maxScore: 100 }));
      } else {
        score = DefinitionalContentRule.SCORE_NOT_PRESENT;
        scoreBreakdown.push({ component: 'No definitional content', points: DefinitionalContentRule.SCORE_NOT_PRESENT });
        evidence.push(EvidenceHelper.error(DefinitionalContentTopic.NO_DEFINITIONS, 'No definitional content found', { target: 'Add definitional content', score: DefinitionalContentRule.SCORE_NOT_PRESENT, maxScore: 100 }));
        recommendations.push(`Create ${DefinitionalContentRule.MIN_DEFINITIONS_POOR}+ definition for 40 points`);
        recommendations.push(`Create ${DefinitionalContentRule.MIN_DEFINITIONS_GOOD}+ definitions for 80 points`);
        recommendations.push(`Create ${DefinitionalContentRule.MIN_DEFINITIONS_EXCELLENT}+ definitions for 100 points`);
      }
      
      // Page type assessment
      evidence.push(EvidenceHelper.info(DefinitionalContentTopic.DEFINITION_ANALYSIS, `Page type: ${llmResponse.pageType.replace(/_/g, ' ')}`));
      evidence.push(EvidenceHelper.info(DefinitionalContentTopic.DEFINITION_ANALYSIS, `Definition density: ${llmResponse.definitionDensity}`));
      evidence.push(EvidenceHelper.info(DefinitionalContentTopic.DEFINITION_ANALYSIS, `Target audience: ${llmResponse.targetAudience}`));
      
      // Structure assessment
      if (llmResponse.hasStructuredMarkup) {
        evidence.push(EvidenceHelper.success(DefinitionalContentTopic.IMPROVEMENT_TIPS, 'Uses semantic definition markup (dl/dt/dd)', { target: 'Semantic markup' }));
      }
      if (llmResponse.hasSchemaMarkup) {
        evidence.push(EvidenceHelper.success(DefinitionalContentTopic.SCHEMA_MARKUP, 'Includes DefinedTerm schema markup', { target: 'Schema markup' }));
      }
      
      // List definitions found
      if (definitionCount > 0) {
        evidence.push(EvidenceHelper.info(DefinitionalContentTopic.DEFINITIONS_LIST, 'Definitions found:'));
        llmResponse.definitions.forEach((def, index) => {
          const quality = def.isDirectDefinition ? '✓' : '○';
          evidence.push(EvidenceHelper.info(DefinitionalContentTopic.DEFINITION_ANALYSIS, `  ${quality} ${def.term}`, def.excerpt ? { code: `     📝 ${def.excerpt}` } : {}));
          evidence.push(EvidenceHelper.info(DefinitionalContentTopic.DEFINITION_ANALYSIS, `     Clarity: ${def.definitionClarity}, Completeness: ${def.definitionCompleteness}`));
          
          const features = [];
          if (def.hasExamples) features.push('examples');
          if (def.hasRelatedTerms) features.push('related terms');
          if (def.hasEtymology) features.push('etymology');
          if (features.length > 0) {
            evidence.push(EvidenceHelper.info(DefinitionalContentTopic.DEFINITION_ANALYSIS, `     Features: ${features.join(', ')}`));
          }
        });
      }
      
      // Quality insights
      const comprehensiveCount = llmResponse.definitions.filter(d => d.definitionCompleteness === 'comprehensive').length;
      if (comprehensiveCount > 0) {
        evidence.push(EvidenceHelper.success(DefinitionalContentTopic.DEFINITION_ANALYSIS, `${comprehensiveCount} comprehensive definitions with full context`, { target: 'Comprehensive definitions' }));
      }
      
      // Recommendations
      if (score < DefinitionalContentRule.SCORE_GOOD) {
        evidence.push(EvidenceHelper.info(DefinitionalContentTopic.DEFINITION_ANALYSIS, '💡 To improve definitional content:'));
        if (!isDedicatedPage) {
          evidence.push(EvidenceHelper.info(DefinitionalContentTopic.IMPROVEMENT_TIPS, `  • Create dedicated "What is X?" pages for key terms`));
        }
        if (clearDefinitions < DefinitionalContentRule.MIN_DEFINITIONS_GOOD) {
          evidence.push(EvidenceHelper.info(DefinitionalContentTopic.IMPROVEMENT_TIPS, '  • Add more clear, direct definitions ("X is...")'));
        }
        if (!llmResponse.hasStructuredMarkup) {
          evidence.push(EvidenceHelper.info(DefinitionalContentTopic.SEMANTIC_MARKUP, '  • Use definition lists (dl/dt/dd) for better structure'));
        }
        if (!llmResponse.hasSchemaMarkup) {
          evidence.push(EvidenceHelper.info(DefinitionalContentTopic.SCHEMA_MARKUP, '  • Add DefinedTerm schema markup'));
        }
        
        const needsExamples = llmResponse.definitions.filter(d => !d.hasExamples).length;
        if (needsExamples > 0) {
          evidence.push(EvidenceHelper.info(DefinitionalContentTopic.IMPROVEMENT_TIPS, '  • Include examples to illustrate concepts'));
        }
        
        const needsRelated = llmResponse.definitions.filter(d => !d.hasRelatedTerms).length;
        if (needsRelated > 0) {
          evidence.push(EvidenceHelper.info(DefinitionalContentTopic.RELATED_TERMS, '  • Link to related terms and concepts'));
        }
        
        evidence.push(EvidenceHelper.info(DefinitionalContentTopic.IMPROVEMENT_TIPS, '  • Build a comprehensive glossary (aim for 5+ key terms)'));
      }
      
    } catch (error) {
      throw new Error(`Failed to analyze definitional content: ${error.message}`);
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