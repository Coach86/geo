import { Injectable, Logger } from '@nestjs/common';
import { RuleRegistryService } from '../rules/registry/rule-registry.service';
import { ConditionalAggregatorService } from '../rules/registry/conditional-aggregator.service';
import { RuleContext } from '../rules/interfaces/rule.interface';
import { PageSignalExtractorService } from '../services/page-signal-extractor.service';
import { PageCategorizerService } from '../services/page-categorizer.service';
import { TrackedLLMService } from '../services/tracked-llm.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
import { HYBRID_CONSTANTS } from '../config/scoring-constants';
import { PageCategoryType, AnalysisLevel } from '../interfaces/page-category.interface';
import { 
  AuthorPresenceRule,
  CitationQualityRule
} from '../rules/authority';

interface AuthorityAnalysisResult {
  score: number;
  calculationDetails: any;
  details: any;
  issues: any[];
}

/**
 * Rule-based Authority Analyzer that replaces the monolithic AuthorityAnalyzer
 * Uses modular rules while preserving existing LLM-based logic
 */
@Injectable()
export class RuleBasedAuthorityAnalyzer {
  private readonly logger = new Logger(RuleBasedAuthorityAnalyzer.name);
  
  constructor(
    private readonly ruleRegistry: RuleRegistryService,
    private readonly conditionalAggregator: ConditionalAggregatorService,
    private readonly pageSignalExtractor: PageSignalExtractorService,
    private readonly pageCategorizerService: PageCategorizerService,
    private readonly trackedLLMService: TrackedLLMService,
    private readonly authorPresenceRule: AuthorPresenceRule,
    private readonly citationQualityRule: CitationQualityRule,
  ) {
    this.registerRules();
  }
  
  /**
   * Register page-scoped authority rules only
   * Domain-scoped rules (like Domain Authority) are registered separately for domain analysis
   */
  private registerRules(): void {
    // Register only page-scoped authority rules with adjusted weights
    // Since we removed Domain Authority (0.25), redistribute its weight
    this.authorPresenceRule.weight = 0.6;  // increased from 0.5
    this.citationQualityRule.weight = 0.4; // increased from 0.25
    
    this.ruleRegistry.register(this.authorPresenceRule);
    this.ruleRegistry.register(this.citationQualityRule);
    
    this.logger.log('Page-scoped authority rules registered successfully');
  }
  
  /**
   * Analyze authority using the rule-based system
   */
  async analyze(
    html: string, 
    metadata: any,
    projectContext?: {
      brandName: string;
      keyBrandAttributes: string[];
      competitors: string[];
    },
    url?: string
  ): Promise<AuthorityAnalysisResult> {
    try {
      // Extract page signals
      const pageSignals = this.pageSignalExtractor.extract(html, metadata, projectContext);
      const cleanContent = this.pageSignalExtractor.getCleanContent(html);
      
      // Categorize the page
      const pageCategory = url ? 
        await this.pageCategorizerService.categorize(url, html, metadata) :
        { type: PageCategoryType.UNKNOWN, confidence: 0, analysisLevel: AnalysisLevel.FULL, reason: 'No URL provided' };
      
      // Extract domain
      const domain = url ? this.extractDomain(url) : 'unknown';
      
      // Run LLM analysis for authority details
      const llmResults = await this.runAuthorityLLMAnalysis(
        cleanContent,
        pageSignals,
        projectContext,
        url
      );
      
      // Build rule context with LLM results
      const context: RuleContext = {
        pageSignals,
        pageCategory,
        domain,
        url: url || '',
        html,
        cleanContent,
        metadata,
        projectContext: projectContext || {
          brandName: '',
          keyBrandAttributes: [],
          competitors: []
        },
        trackedLLMService: this.trackedLLMService,
        llmResults
      };
      
      // Get applicable page-scoped rules for this context
      const rules = this.ruleRegistry.getRulesForDimension('authority', context, 'page');
      
      this.logger.log(`Running ${rules.length} authority rules for ${url}`);
      
      // Execute all applicable rules
      const ruleResults = await Promise.all(
        rules.map(rule => rule.evaluate(context))
      );
      
      // Aggregate results using conditional thresholds
      const aggregated = this.conditionalAggregator.aggregate(
        ruleResults,
        'authority',
        rules.map(r => ({ id: r.id, name: r.name }))
      );
      
      // Convert to the expected format
      return {
        score: aggregated.finalScore,
        calculationDetails: aggregated.calculationDetails,
        details: this.extractAuthorityDetails(aggregated),
        issues: aggregated.issues
      };
      
    } catch (error) {
      this.logger.error('Error in rule-based authority analysis:', error);
      throw error;
    }
  }
  
  /**
   * Extract authority details from aggregated results
   * This maintains compatibility with the existing format
   */
  private extractAuthorityDetails(aggregated: any): any {
    const details: any = {
      hasAuthor: false,
      authorName: null,
      authorCredentials: [],
      outboundCitations: 0,
      trustedCitations: [],
      domainAuthority: 'unknown',
      citationCount: 0
    };
    
    // Extract details from each rule's results
    aggregated.ruleResults.forEach((result: any) => {
      if (result.details) {
        Object.assign(details, result.details);
      }
    });
    
    return details;
  }
  
  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.toLowerCase();
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Run LLM analysis for authority detection
   */
  private async runAuthorityLLMAnalysis(
    cleanContent: string,
    pageSignals: any,
    projectContext?: any,
    url?: string
  ): Promise<any> {
    try {
      // Build focused prompt for authority analysis
      const prompt = this.buildAuthorityPrompt(cleanContent, pageSignals);
      
      // Call LLM for authority analysis
      const response = await this.trackedLLMService.call(
        url || 'unknown',
        'authority_analysis',
        LlmProvider.OpenAILangChain,
        prompt,
        {
          model: HYBRID_CONSTANTS.LLM.MODEL,
          temperature: HYBRID_CONSTANTS.LLM.TEMPERATURE,
          maxTokens: HYBRID_CONSTANTS.LLM.MAX_TOKENS,
        }
      );
      
      // Parse the response
      const parsed = this.parseAuthorityResponse(response.text);
      
      return {
        authority: parsed.authority
      };
      
    } catch (error) {
      this.logger.error('Error in authority LLM analysis:', error);
      // Return default values on error
      return {
        authority: {
          hasAuthor: false,
          authorName: null,
          citationCount: 0,
          authorCredentials: false,
          trustedCitations: []
        }
      };
    }
  }
  
  /**
   * Build prompt for authority analysis
   */
  private buildAuthorityPrompt(content: string, pageSignals: any): string {
    const contentPreview = content.substring(0, 3000);
    
    return `Analyze the following content for authority indicators:

Content:
${contentPreview}

Please analyze and respond with a JSON object containing:
{
  "authority": {
    "hasAuthor": boolean,
    "authorName": string or null,
    "authorCredentials": boolean,
    "citationCount": number,
    "trustedCitations": string[] // list of any high-quality sources cited
  }
}

Focus on:
1. Author presence and attribution
2. Professional credentials or expertise indicators
3. Citations, references, or sources
4. Evidence of research or expertise`;
  }
  
  /**
   * Parse LLM response for authority data
   */
  private parseAuthorityResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Ensure logical consistency
      if (!parsed.authority.hasAuthor) {
        parsed.authority.authorCredentials = false;
        parsed.authority.authorName = null;
      }
      
      return parsed;
      
    } catch (error) {
      this.logger.error('Failed to parse authority response:', error);
      return {
        authority: {
          hasAuthor: false,
          authorName: null,
          citationCount: 0,
          authorCredentials: false,
          trustedCitations: []
        }
      };
    }
  }
}