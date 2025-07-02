import { Injectable, Logger } from '@nestjs/common';
import { RuleRegistryService } from '../rules/registry/rule-registry.service';
import { ConditionalAggregatorService } from '../rules/registry/conditional-aggregator.service';
import { RuleContext } from '../rules/interfaces/rule.interface';
import { PageSignals } from '../interfaces/page-signals.interface';
import { PageCategory } from '../interfaces/page-category.interface';
import { LlmService } from '../../llm/services/llm.service';
import { ScoreIssue } from '../schemas/content-score.schema';
import { DimensionCalculationDetails } from '../interfaces/score-calculation.interface';

export interface StructureAnalysisResult {
  score: number;
  details: {
    h1Count: number;
    headingHierarchy: boolean;
    headingHierarchyScore: number;
    schemaTypes: string[];
    avgSentenceWords: number;
  };
  issues: ScoreIssue[];
  ruleContributions: Array<{
    ruleName: string;
    score: number;
    evidence: string[];
    issues: ScoreIssue[];
  }>;
  calculationDetails: DimensionCalculationDetails['structure'];
}

@Injectable()
export class RuleBasedStructureAnalyzer {
  private readonly logger = new Logger(RuleBasedStructureAnalyzer.name);

  constructor(
    private readonly ruleRegistry: RuleRegistryService,
    private readonly conditionalAggregator: ConditionalAggregatorService,
    private readonly llmService: LlmService,
  ) {
    this.registerRules();
  }

  /**
   * Register all structure rules
   */
  private registerRules(): void {
    // Import rule classes
    const { 
      HeadingHierarchyRule, 
      SchemaMarkupRule, 
      ReadabilityRule, 
      ListsTablesRule,
      SentenceStructureRule,
      QAContentRule 
    } = require('../rules/structure');
    
    // Register rules with their configurations
    this.ruleRegistry.registerRule(HeadingHierarchyRule, { weight: 0.25 });
    this.ruleRegistry.registerRule(SchemaMarkupRule, { weight: 0.25 });
    this.ruleRegistry.registerRule(ReadabilityRule, { weight: 0.15 });
    this.ruleRegistry.registerRule(ListsTablesRule, { weight: 0.15 });
    this.ruleRegistry.registerRule(SentenceStructureRule, { weight: 0.1 });
    this.ruleRegistry.registerRule(QAContentRule, { weight: 0.1 });
    
    this.logger.log('Structure rules registered successfully');
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
  ): Promise<StructureAnalysisResult> {
    this.logger.log(`[Structure] Starting rule-based analysis for ${url}`);

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
      llmService: this.llmService
    };

    // Get and apply structure rules
    const structureRules = this.ruleRegistry.getRulesForDimension('structure', context);
    this.logger.log(`[Structure] Found ${structureRules.length} rules to apply`);

    const ruleResults = [];
    const ruleDetails = [];
    const ruleContributions = [];
    
    for (const rule of structureRules) {
      this.logger.log(`[Structure] Applying rule: ${rule.name}`);
      const result = await rule.evaluate(context);
      ruleResults.push(result);
      ruleDetails.push({ id: rule.id, name: rule.name });
      ruleContributions.push({
        ruleName: rule.name,
        score: result.score,
        evidence: result.evidence,
        issues: (result.issues || []).map(issue => ({
          dimension: 'structure',
          severity: issue.severity,
          description: issue.description,
          recommendation: issue.recommendation
        }))
      });
    }

    // Aggregate scores using conditional thresholds
    const aggregation = this.conditionalAggregator.aggregate(ruleResults, 'structure', ruleDetails);

    // Extract details from pageSignals
    const details = {
      h1Count: pageSignals.structure.h1Count,
      headingHierarchy: pageSignals.structure.headingHierarchyScore > 70,
      headingHierarchyScore: pageSignals.structure.headingHierarchyScore,
      schemaTypes: pageSignals.structure.schemaTypes || [],
      avgSentenceWords: pageSignals.structure.avgSentenceWords
    };

    this.logger.log(`[Structure] Analysis complete - Final score: ${aggregation.finalScore}`);

    return {
      score: aggregation.finalScore,
      details,
      issues: aggregation.issues.map(issue => ({
        dimension: 'structure',
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