import { Injectable, Logger } from '@nestjs/common';
import { RuleRegistryService } from '../rules/registry/rule-registry.service';
import { RuleAggregatorService } from '../rules/registry/rule-aggregator.service';
import { RuleContext } from '../rules/interfaces/rule.interface';
import { PageSignals } from '../interfaces/page-signals.interface';
import { PageCategory } from '../interfaces/page-category.interface';
import { LlmService } from '../../llm/services/llm.service';
import { ScoreIssue } from '../schemas/content-score.schema';
import { DimensionCalculationDetails } from '../interfaces/score-calculation.interface';

export interface SnippetAnalysisResult {
  score: number;
  details: {
    avgSentenceWords: number;
    listCount: number;
    qaBlockCount: number;
    extractableBlocks: number;
  };
  issues: ScoreIssue[];
  ruleContributions: Array<{
    ruleName: string;
    score: number;
    evidence: string[];
    issues: ScoreIssue[];
  }>;
  calculationDetails: DimensionCalculationDetails['snippetExtractability'];
}

@Injectable()
export class RuleBasedSnippetAnalyzer {
  private readonly logger = new Logger(RuleBasedSnippetAnalyzer.name);

  constructor(
    private readonly ruleRegistry: RuleRegistryService,
    private readonly ruleAggregator: RuleAggregatorService,
    private readonly llmService: LlmService,
  ) {
    this.registerRules();
  }

  /**
   * Register all snippet rules
   */
  private registerRules(): void {
    // Import rule classes
    const { SentenceStructureRule, ListContentRule, QAContentRule } = require('../rules/snippet');
    
    // Register rules with their configurations
    this.ruleRegistry.registerRule(SentenceStructureRule, { weight: 0.4 });
    this.ruleRegistry.registerRule(ListContentRule, { weight: 0.3 });
    this.ruleRegistry.registerRule(QAContentRule, { weight: 0.3 });
    
    this.logger.log('Snippet rules registered successfully');
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
  ): Promise<SnippetAnalysisResult> {
    this.logger.log(`[Snippet] Starting rule-based analysis for ${url}`);

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

    // Get and apply snippet rules
    const snippetRules = this.ruleRegistry.getRulesForDimension('snippetExtractability', context);
    this.logger.log(`[Snippet] Found ${snippetRules.length} rules to apply`);

    const ruleResults = [];
    const ruleDetails = [];
    const ruleContributions = [];
    
    for (const rule of snippetRules) {
      this.logger.log(`[Snippet] Applying rule: ${rule.name}`);
      const result = await rule.evaluate(context);
      ruleResults.push(result);
      ruleDetails.push({ id: rule.id, name: rule.name });
      ruleContributions.push({
        ruleName: rule.name,
        score: result.score,
        evidence: result.evidence,
        issues: (result.issues || []).map(issue => ({
          dimension: 'snippetExtractability',
          severity: issue.severity,
          description: issue.description,
          recommendation: issue.recommendation
        }))
      });
    }

    // Aggregate scores
    const aggregation = this.ruleAggregator.aggregate(ruleResults, 'snippetExtractability', ruleDetails);

    // Extract details from pageSignals
    const details = {
      avgSentenceWords: pageSignals.snippet.avgSentenceLength,
      listCount: pageSignals.snippet.listItemCount,
      qaBlockCount: pageSignals.snippet.qaBlockCount,
      extractableBlocks: pageSignals.snippet.stepCount + pageSignals.snippet.bulletPoints
    };

    this.logger.log(`[Snippet] Analysis complete - Final score: ${aggregation.finalScore}`);

    return {
      score: aggregation.finalScore,
      details,
      issues: aggregation.issues.map(issue => ({
        dimension: 'snippetExtractability',
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