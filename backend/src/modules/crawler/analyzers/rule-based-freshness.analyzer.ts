import { Injectable, Logger } from '@nestjs/common';
import { RuleRegistryService } from '../rules/registry/rule-registry.service';
import { ConditionalAggregatorService } from '../rules/registry/conditional-aggregator.service';
import { RuleContext } from '../rules/interfaces/rule.interface';
import { PageSignalExtractorService } from '../services/page-signal-extractor.service';
import { PageCategorizerService } from '../services/page-categorizer.service';
import { TrackedLLMService } from '../services/tracked-llm.service';
import { PageCategoryType, AnalysisLevel } from '../interfaces/page-category.interface';
import { 
  UpdateFrequencyRule
} from '../rules/freshness';

interface FreshnessAnalysisResult {
  score: number;
  calculationDetails: any;
  details: any;
  issues: any[];
  daysSinceUpdate?: number;
  hasDateSignals: boolean;
  publishDate?: Date;
  modifiedDate?: Date;
}

/**
 * Rule-based Freshness Analyzer that replaces the monolithic FreshnessAnalyzer
 * Uses modular rules while preserving existing logic
 */
@Injectable()
export class RuleBasedFreshnessAnalyzer {
  private readonly logger = new Logger(RuleBasedFreshnessAnalyzer.name);
  
  constructor(
    private readonly ruleRegistry: RuleRegistryService,
    private readonly conditionalAggregator: ConditionalAggregatorService,
    private readonly pageSignalExtractor: PageSignalExtractorService,
    private readonly pageCategorizerService: PageCategorizerService,
    private readonly trackedLLMService: TrackedLLMService
  ) {
    this.registerRules();
  }
  
  /**
   * Register all freshness rules
   */
  private registerRules(): void {
    // Register rules with their configurations
    // UpdateFrequencyRule is now the only freshness rule
    this.ruleRegistry.registerRule(UpdateFrequencyRule, { weight: 1.0 });
    
    this.logger.log('Freshness rules registered successfully');
  }
  
  /**
   * Analyze freshness using the rule-based system
   * This method maintains the same interface as the original analyzer
   */
  async analyze(
    html: string, 
    metadata: any,
    url?: string,
    projectContext?: {
      brandName: string;
      keyBrandAttributes: string[];
      competitors: string[];
    }
  ): Promise<FreshnessAnalysisResult> {
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
      
      // Build rule context
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
        trackedLLMService: this.trackedLLMService
      };
      
      // Get applicable page-scoped rules for this context
      const rules = this.ruleRegistry.getRulesForDimension('freshness', context, 'page');
      
      this.logger.log(`Running ${rules.length} freshness rules for ${url}`);
      
      // Execute all applicable rules
      const ruleResults = await Promise.all(
        rules.map(rule => rule.evaluate(context))
      );
      
      // Aggregate results using conditional thresholds
      const aggregated = this.conditionalAggregator.aggregate(
        ruleResults,
        'freshness',
        rules.map(r => ({ id: r.id, name: r.name }))
      );
      
      // Extract freshness-specific details from aggregated results
      const freshnessDetails = this.extractFreshnessDetails(aggregated);
      
      // Convert to the expected format
      return {
        score: aggregated.finalScore,
        calculationDetails: aggregated.calculationDetails,
        details: freshnessDetails,
        issues: aggregated.issues,
        ...freshnessDetails // Spread individual properties for backward compatibility
      };
      
    } catch (error) {
      this.logger.error('Error in rule-based freshness analysis:', error);
      throw error;
    }
  }
  
  /**
   * Extract freshness details from aggregated results
   * This maintains compatibility with the existing format
   */
  private extractFreshnessDetails(aggregated: any): any {
    const details: any = {
      hasDateSignals: false,
      publishDate: null,
      modifiedDate: null,
      daysSinceUpdate: null
    };
    
    // Extract details from each rule's results
    aggregated.ruleResults.forEach((result: any) => {
      if (result.ruleId === 'update-frequency' && result.details) {
        details.daysSinceUpdate = result.details.daysSinceUpdate;
        if (result.details.lastUpdate) {
          details.modifiedDate = new Date(result.details.lastUpdate);
          details.hasDateSignals = true;
        }
      }
    });
    
    return details;
  }
  
  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return urlObj.hostname.toLowerCase();
    } catch {
      return 'unknown';
    }
  }
}