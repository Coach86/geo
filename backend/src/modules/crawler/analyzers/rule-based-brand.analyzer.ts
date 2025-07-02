import { Injectable, Logger } from '@nestjs/common';
import { RuleRegistryService } from '../rules/registry/rule-registry.service';
import { ConditionalAggregatorService } from '../rules/registry/conditional-aggregator.service';
import { RuleContext } from '../rules/interfaces/rule.interface';
import { PageSignals } from '../interfaces/page-signals.interface';
import { PageCategory } from '../interfaces/page-category.interface';
import { TrackedLLMService } from '../services/tracked-llm.service';
import { ScoreIssue } from '../schemas/content-score.schema';
import { DimensionCalculationDetails } from '../interfaces/score-calculation.interface';

export interface BrandAnalysisResult {
  score: number;
  details: {
    brandKeywordMatches: number;
    requiredTermsFound: string[];
    outdatedTermsFound: string[];
    brandConsistency: number;
  };
  issues: ScoreIssue[];
  ruleContributions: Array<{
    ruleName: string;
    score: number;
    evidence: string[];
    issues: ScoreIssue[];
  }>;
  calculationDetails: DimensionCalculationDetails['brandAlignment'];
}

@Injectable()
export class RuleBasedBrandAnalyzer {
  private readonly logger = new Logger(RuleBasedBrandAnalyzer.name);

  constructor(
    private readonly ruleRegistry: RuleRegistryService,
    private readonly conditionalAggregator: ConditionalAggregatorService,
    private readonly trackedLLMService: TrackedLLMService,
  ) {
    this.registerRules();
  }

  /**
   * Register all brand rules
   */
  private registerRules(): void {
    // Import rule classes
    const { BrandPresenceRule, KeywordAlignmentRule } = require('../rules/brand');
    
    // Register rules with their configurations
    this.ruleRegistry.registerRule(BrandPresenceRule, { weight: 0.4 });
    this.ruleRegistry.registerRule(KeywordAlignmentRule, { weight: 0.6 });
    
    this.logger.log('Brand rules registered successfully');
  }

  async analyze(
    pageSignals: PageSignals,
    pageCategory: PageCategory,
    domain: string,
    url: string,
    html: string,
    cleanContent: string,
    metadata: any,
    projectContext?: any
  ): Promise<BrandAnalysisResult> {
    this.logger.log(`[Brand] Starting rule-based analysis for ${url}`);

    // Create rule context
    const context: RuleContext = {
      pageSignals,
      pageCategory,
      domain,
      url,
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

    // Get and apply brand rules
    const brandRules = this.ruleRegistry.getRulesForDimension('brandAlignment', context, 'page');
    this.logger.log(`[Brand] Found ${brandRules.length} rules to apply`);

    const ruleResults = [];
    const ruleDetails = [];
    const ruleContributions = [];
    
    for (const rule of brandRules) {
      this.logger.log(`[Brand] Applying rule: ${rule.name}`);
      const result = await rule.evaluate(context);
      ruleResults.push(result);
      ruleDetails.push({ id: rule.id, name: rule.name });
      ruleContributions.push({
        ruleName: rule.name,
        score: result.score,
        evidence: result.evidence,
        issues: (result.issues || []).map(issue => ({
          dimension: 'brandAlignment',
          severity: issue.severity,
          description: issue.description,
          recommendation: issue.recommendation
        }))
      });
    }

    // Aggregate scores
    const aggregation = this.conditionalAggregator.aggregate(
      ruleResults, 
      'brandAlignment', 
      ruleDetails
    );

    // Extract details from pageSignals
    const details = {
      brandKeywordMatches: pageSignals.brand.brandMentionCount,
      requiredTermsFound: pageSignals.brand.contextQuality || [],
      outdatedTermsFound: [],
      brandConsistency: Math.round((pageSignals.brand.brandMentionCount / Math.max(1, projectContext?.keyBrandAttributes?.length || 1)) * 100)
    };

    this.logger.log(`[Brand] Analysis complete - Final score: ${aggregation.finalScore}`);

    return {
      score: aggregation.finalScore,
      details,
      issues: aggregation.issues.map(issue => ({
        dimension: 'brandAlignment',
        severity: issue.severity,
        description: issue.description,
        recommendation: issue.recommendation
      })),
      ruleContributions,
      calculationDetails: {
        ...aggregation.calculationDetails,
        finalScore: aggregation.finalScore
      }
    };
  }
}