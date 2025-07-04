import { Injectable, Logger } from '@nestjs/common';
import { RuleRegistryService } from '../rules/registry/rule-registry.service';
import { ConditionalAggregatorService } from '../rules/registry/conditional-aggregator.service';
import { DomainAnalysisRepository } from '../repositories/domain-analysis.repository';
import { TrackedLLMService } from './tracked-llm.service';
import { PageCategorizerService } from './page-categorizer.service';
import { AEORuleRegistryService as AiEngineRuleRegistryService } from './aeo-rule-registry.service';
import { RuleContext, RuleDimension } from '../rules/interfaces/rule.interface';
import { PageSignals } from '../interfaces/page-signals.interface';
import { PageCategory } from '../interfaces/page-category.interface';
import { EvidenceHelper } from '../utils/evidence.helper';
import { PageContent, Category, CategoryScore, RuleResult } from '../interfaces/rule.interface';
import { BaseAEORule as BaseRule } from '../rules/aeo/base-aeo.rule';
// Old rule import removed - using AEO rules now

export interface DomainAnalysisInput {
  domain: string;
  projectId: string;
  projectContext: {
    brandName: string;
    keyBrandAttributes: string[];
    competitors: string[];
  };
  pages: Array<{
    url: string;
    html: string;
    metadata: any;
  }>;
}

export interface DomainAnalysisResult {
  domain: string;
  overallScore: number;
  dimensionScores: Partial<Record<RuleDimension, {
    score: number;
    weight: number;
    contribution: number;
  }>>;
  ruleResults: any[];
  issues: string[];
  recommendations: string[];
  calculationDetails: any;
  metadata: {
    totalPages: number;
    pagesAnalyzed: string[];
    analysisStartedAt: Date;
    analysisCompletedAt: Date;
    llmCallsMade: number;
  };
}

/**
 * Service for domain-level analysis
 * This service is currently being migrated to use AEO rules
 */
@Injectable()
export class DomainAnalysisService {
  private readonly logger = new Logger(DomainAnalysisService.name);

  constructor(
    private readonly ruleRegistry: RuleRegistryService,
    private readonly conditionalAggregator: ConditionalAggregatorService,
    private readonly domainAnalysisRepository: DomainAnalysisRepository,
    private readonly trackedLLMService: TrackedLLMService,
    private readonly pageCategorizerService: PageCategorizerService,
    private readonly aiEngineRuleRegistry: AiEngineRuleRegistryService,
  ) {}

  /**
   * Analyze a domain using AEO domain-scoped rules
   */
  async analyzeDomain(projectId: string, domain: string, project: any, homePage?: any): Promise<void> {
    this.logger.log(`[DOMAIN] Starting domain analysis for ${domain}`);
    
    try {
      const analysisStartedAt = new Date();
      
      // Get domain-level rules
      const domainRules = this.aiEngineRuleRegistry.getDomainRules();
      this.logger.log(`[DOMAIN] Found ${domainRules.length} domain-level rules to execute`);
      
      // Create page content for domain-level analysis
      const domainPageContent: PageContent = {
        url: homePage?.url || `https://${domain}`,
        html: homePage?.html || '', // Use actual homepage HTML if available
        cleanContent: homePage?.cleanContent || '',
        pageSignals: this.createEmptyPageSignals(),
        pageCategory: { type: 'homepage', confidence: 1, analysisLevel: 'FULL' } as any,
        metadata: { 
          projectId, 
          domain,
          ...(homePage?.metadata || {})
        },
        securityInfo: { isHttps: true, hasMixedContent: false, certificateValid: true },
        performanceMetrics: homePage?.performanceMetrics || {},
        structuralElements: this.extractStructuralElements(homePage?.html || '')
      };

      // Group rules by category
      const rulesByCategory = this.groupRulesByCategory(domainRules);
      
      // Execute rules by category
      const categoryScores: Record<string, CategoryScore> = {};
      const allRuleResults: RuleResult[] = [];
      
      for (const [category, rules] of Object.entries(rulesByCategory)) {
        const categoryScore = await this.executeCategoryRules(
          category as Category, 
          rules, 
          `https://${domain}`, 
          domainPageContent
        );
        const categoryKey = category.toLowerCase().replace(/_/g, '');
        categoryScores[categoryKey] = categoryScore;
        
        // Flatten rule results
        categoryScore.ruleResults.forEach(result => {
          allRuleResults.push({
            ruleId: result.ruleId,
            ruleName: result.ruleName,
            score: result.score,
            maxScore: result.maxScore,
            weight: result.weight,
            contribution: result.contribution,
            passed: result.passed,
            evidence: result.evidence,
            issues: result.issues?.map(issue => ({
              ...issue,
              dimension: categoryScore.category.toLowerCase().replace(/_/g, '').replace('monitoringkpi', 'monitoringKpi')
            })),
            details: result.details
          });
        });
      }

      // Ensure all categories have scores
      const allCategories: Category[] = ['TECHNICAL', 'CONTENT', 'AUTHORITY', 'MONITORING_KPI'];
      for (const category of allCategories) {
        const key = category.toLowerCase().replace(/_/g, '');
        if (!categoryScores[key]) {
          categoryScores[key] = this.createEmptyCategoryScore(category);
        }
      }

      // Calculate overall score
      const categoryScoreValues = Object.values(categoryScores).map(cat => cat.score);
      const overallScore = Math.round(
        categoryScoreValues.reduce((sum, score) => sum + score, 0) / categoryScoreValues.length
      );

      // Create analysis results
      const analysisResults = {
        technical: {
          score: categoryScores.technical.score,
          maxScore: 100,
          evidence: categoryScores.technical.ruleResults.flatMap(r => r.evidence),
          details: {},
          issues: categoryScores.technical.issues
        },
        content: {
          score: categoryScores.content.score,
          maxScore: 100,
          evidence: categoryScores.content.ruleResults.flatMap(r => r.evidence),
          details: {},
          issues: categoryScores.content.issues
        },
        authority: {
          score: categoryScores.authority.score,
          maxScore: 100,
          evidence: categoryScores.authority.ruleResults.flatMap(r => r.evidence),
          details: {},
          issues: categoryScores.authority.issues
        },
        monitoringKpi: {
          score: categoryScores.monitoringkpi.score,
          maxScore: 100,
          evidence: categoryScores.monitoringkpi.ruleResults.flatMap(r => r.evidence),
          details: {},
          issues: categoryScores.monitoringkpi.issues
        }
      };

      // Save to database
      await this.domainAnalysisRepository.upsert({
        domain,
        projectId,
        analysisResults,
        ruleResults: allRuleResults,
        overallScore,
        calculationDetails: {
          totalWeight: 4,
          weightedScore: overallScore,
          finalScore: overallScore,
          dimensionBreakdown: {
            technical: { score: analysisResults.technical.score, weight: 1, contribution: 25 },
            content: { score: analysisResults.content.score, weight: 1, contribution: 25 },
            authority: { score: analysisResults.authority.score, weight: 1, contribution: 25 },
            monitoringKpi: { score: analysisResults.monitoringKpi.score, weight: 1, contribution: 25 },
          }
        },
        issues: Object.values(categoryScores).flatMap(cat => cat.issues),
        recommendations: Object.values(categoryScores).flatMap(cat => cat.recommendations),
        metadata: {
          totalPages: 1,
          pagesAnalyzed: [domain],
          analysisStartedAt,
          analysisCompletedAt: new Date(),
          llmCallsMade: 0
        }
      });

      this.logger.log(`[DOMAIN] Domain analysis completed for ${domain} - Score: ${overallScore}, Rules executed: ${allRuleResults.length}`);
    } catch (error) {
      this.logger.error(`[DOMAIN] Error analyzing domain ${domain}:`, error);
      throw error;
    }
  }

  /**
   * Get domain analyses for a project
   */
  async getProjectDomainAnalyses(projectId: string): Promise<any[]> {
    return this.domainAnalysisRepository.findByProject(projectId);
  }

  private createEmptyPageSignals(): PageSignals {
    return {
      content: {
        h1Text: '',
        metaDescription: '',
        wordCount: 0,
        hasAuthor: false,
        hasByline: false,
        hasAuthorBio: false,
        citationCount: 0,
        internalLinkCount: 0,
        externalLinkCount: 0,
        hasSources: false,
        hasReferences: false,
        academicSourceCount: 0,
        newsSourceCount: 0,
        industrySourceCount: 0
      },
      structure: {
        h1Count: 0,
        headingHierarchy: [],
        listCount: 0,
        schemaTypes: [],
        hasSchema: false,
        wordCount: 0,
        avgSentenceWords: 0,
        headingHierarchyScore: 0
      },
      freshness: {
        hasDateInUrl: false,
        hasDateInTitle: false,
        yearMentionCount: 0,
        updateIndicators: []
      },
      brand: {
        brandMentionCount: 0,
        competitorMentionCount: 0,
        brandInTitle: false,
        brandInH1: false,
        brandInUrl: false,
        brandProminence: 0,
        contextQuality: []
      },
      snippet: {
        qaBlockCount: 0,
        listItemCount: 0,
        avgSentenceLength: 0,
        definitionCount: 0,
        hasStructuredData: false,
        stepCount: 0,
        bulletPoints: 0
      }
    };
  }

  private groupRulesByCategory(rules: BaseRule[]): Record<string, BaseRule[]> {
    const grouped: Record<string, BaseRule[]> = {};
    
    rules.forEach(rule => {
      const category = rule.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(rule);
    });
    
    return grouped;
  }

  private async executeCategoryRules(
    category: Category,
    rules: BaseRule[],
    url: string,
    content: PageContent
  ): Promise<CategoryScore> {
    const ruleResults: RuleResult[] = [];
    let totalScore = 0;
    let totalWeight = 0;
    let passedRules = 0;

    for (const rule of rules) {
      try {
        const result = await rule.evaluate(url, content);
        ruleResults.push(result);
        
        totalScore += result.score * result.weight;
        totalWeight += result.weight;
        
        if (result.passed) {
          passedRules++;
        }
      } catch (error) {
        this.logger.error(`[DOMAIN] Error executing rule ${rule.id}:`, error);
        // Add a failed result
        ruleResults.push({
          ruleId: rule.id,
          ruleName: rule.name,
          score: 0,
          maxScore: 100,
          weight: rule.getWeight(),
          contribution: 0,
          passed: false,
          evidence: [EvidenceHelper.error(`Error executing rule: ${error.message}`)],
          issues: [{
            severity: 'critical' as const,
            description: `Rule execution failed: ${error.message}`,
            recommendation: 'Check rule configuration and try again'
          }],
          details: { error: error.message }
        });
      }
    }

    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

    return {
      category,
      score: finalScore,
      weight: 1,
      appliedRules: rules.length,
      passedRules,
      ruleResults,
      issues: ruleResults.flatMap(r => r.issues?.map(i => i.description) || []),
      recommendations: ruleResults.flatMap(r => r.issues?.map(i => i.recommendation) || [])
    };
  }

  private createEmptyCategoryScore(category: Category): CategoryScore {
    return {
      category,
      score: 0,
      weight: 1,
      appliedRules: 0,
      passedRules: 0,
      ruleResults: [],
      issues: [],
      recommendations: []
    };
  }

  private extractStructuralElements(html: string): any {
    if (!html) {
      return { h1Count: 0, h1Text: [], semanticTags: [], schemaTypes: [] };
    }
    
    const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || [];
    const semanticTags = ['article', 'section', 'nav', 'header', 'footer', 'main', 'aside'];
    const foundSemanticTags = semanticTags.filter(tag => 
      new RegExp(`<${tag}[^>]*>`, 'i').test(html)
    );
    
    // Extract schema types
    const schemaMatches = html.match(/"@type":\s*"([^"]+)"/g) || [];
    const schemaTypes = schemaMatches.map(match => 
      match.match(/"@type":\s*"([^"]+)"/)?.[1] || ''
    ).filter(Boolean);
    
    return {
      h1Count: h1Matches.length,
      h1Text: h1Matches.map(h1 => h1.replace(/<[^>]+>/g, '').trim()),
      semanticTags: foundSemanticTags,
      schemaTypes: [...new Set(schemaTypes)] // Deduplicate
    };
  }
}