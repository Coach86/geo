import { Injectable, Logger } from '@nestjs/common';
import { RuleRegistryService } from '../rules/registry/rule-registry.service';
import { ConditionalAggregatorService } from '../rules/registry/conditional-aggregator.service';
import { DomainAnalysisRepository } from '../repositories/domain-analysis.repository';
import { TrackedLLMService } from './tracked-llm.service';
import { PageSignalExtractorService } from './page-signal-extractor.service';
import { PageCategorizerService } from './page-categorizer.service';
import { RuleContext, RuleDimension } from '../rules/interfaces/rule.interface';
import { PageSignals } from '../interfaces/page-signals.interface';
import { PageCategory } from '../interfaces/page-category.interface';
import { DomainAuthorityRule } from '../rules/authority/domain-authority.rule';

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

@Injectable()
export class DomainAnalysisService {
  private readonly logger = new Logger(DomainAnalysisService.name);

  constructor(
    private readonly ruleRegistry: RuleRegistryService,
    private readonly conditionalAggregator: ConditionalAggregatorService,
    private readonly domainAnalysisRepository: DomainAnalysisRepository,
    private readonly trackedLLMService: TrackedLLMService,
    private readonly pageSignalExtractor: PageSignalExtractorService,
    private readonly pageCategorizerService: PageCategorizerService,
    private readonly domainAuthorityRule: DomainAuthorityRule,
  ) {
    this.registerDomainRules();
  }

  /**
   * Register domain-scoped rules
   */
  private registerDomainRules(): void {
    // Register domain authority rule with appropriate weight
    this.domainAuthorityRule.weight = 1.0; // Full weight for domain analysis
    this.ruleRegistry.register(this.domainAuthorityRule);
    
    this.logger.log('Domain-scoped rules registered successfully');
  }

  /**
   * Analyze a domain using domain-scoped rules
   */
  async analyzeDomain(input: DomainAnalysisInput): Promise<DomainAnalysisResult> {
    const startTime = new Date();
    this.logger.log(`Starting domain analysis for ${input.domain} with ${input.pages.length} pages`);

    try {
      // Check if we have valid cached analysis
      const cachedAnalysis = await this.domainAnalysisRepository.getValidAnalysis(
        input.domain, 
        input.projectId
      );

      if (cachedAnalysis) {
        this.logger.log(`Using cached domain analysis for ${input.domain}`);
        return this.convertToAnalysisResult(cachedAnalysis, startTime);
      }

      // Prepare domain context
      const domainContext = await this.prepareDomainContext(input.pages, input.projectContext);

      // Get domain-scoped rules
      const domainRules = this.ruleRegistry.getAllRules();
      const applicableDomainRules: any[] = [];

      domainRules.forEach((rules, dimension) => {
        const dimensionDomainRules = rules.filter(rule => rule.executionScope === 'domain');
        applicableDomainRules.push(...dimensionDomainRules);
      });

      this.logger.log(`Found ${applicableDomainRules.length} domain-scoped rules to execute`);

      if (applicableDomainRules.length === 0) {
        this.logger.warn(`No domain-scoped rules found for ${input.domain}`);
        return this.createEmptyResult(input, startTime);
      }

      // Create rule context for domain analysis
      const ruleContext: RuleContext = {
        // Use first page as representative context (for compatibility)
        pageSignals: domainContext.representativeSignals,
        pageCategory: domainContext.representativeCategory,
        domain: input.domain,
        url: `https://${input.domain}`, // Representative URL
        html: '', // Not needed for domain analysis
        cleanContent: '', // Not needed for domain analysis
        metadata: {},
        projectContext: input.projectContext,
        trackedLLMService: this.trackedLLMService,
        domainContext: {
          allPages: domainContext.allPages,
          domainInfo: {
            totalPages: input.pages.length,
            domains: [input.domain],
            pageTypes: domainContext.pageTypes
          }
        }
      };

      // Execute domain-scoped rules
      const ruleResults = await Promise.all(
        applicableDomainRules.map(async (rule) => {
          try {
            this.logger.log(`Executing domain rule: ${rule.name} for ${input.domain}`);
            const result = await rule.evaluate(ruleContext);
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              dimension: rule.dimension,
              ...result
            };
          } catch (error) {
            this.logger.error(`Error executing domain rule ${rule.name}:`, error);
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              dimension: rule.dimension,
              score: 0,
              maxScore: 100,
              weight: rule.weight,
              contribution: 0,
              passed: false,
              evidence: [`Error executing rule: ${error.message}`],
              details: { error: error.message },
              issues: [{
                severity: 'high' as const,
                description: `Rule execution failed: ${error.message}`,
                recommendation: 'Check rule implementation and retry analysis'
              }]
            };
          }
        })
      );

      // Aggregate results by dimension
      const dimensionResults = this.aggregateByDimension(ruleResults);

      // Calculate overall domain score
      const overallScore = this.calculateOverallScore(dimensionResults);

      // Gather issues and recommendations
      const issues = ruleResults.flatMap(r => r.issues?.map((i: any) => i.description) || []);
      const recommendations = ruleResults.flatMap(r => r.issues?.map((i: any) => i.recommendation) || []);

      const endTime = new Date();
      const result: DomainAnalysisResult = {
        domain: input.domain,
        overallScore,
        dimensionScores: dimensionResults,
        ruleResults,
        issues: [...new Set(issues)], // Remove duplicates
        recommendations: [...new Set(recommendations)], // Remove duplicates
        calculationDetails: {
          totalWeight: applicableDomainRules.reduce((sum, rule) => sum + rule.weight, 0),
          weightedScore: overallScore,
          finalScore: overallScore,
          dimensionBreakdown: dimensionResults
        },
        metadata: {
          totalPages: input.pages.length,
          pagesAnalyzed: input.pages.map(p => p.url),
          analysisStartedAt: startTime,
          analysisCompletedAt: endTime,
          llmCallsMade: 0 // TODO: Implement LLM call counting
        }
      };

      // Store result in database
      await this.storeDomainAnalysis(input.projectId, result);

      this.logger.log(`Domain analysis completed for ${input.domain}. Score: ${overallScore}`);
      return result;

    } catch (error) {
      this.logger.error(`Error analyzing domain ${input.domain}:`, error);
      throw error;
    }
  }

  /**
   * Get cached domain analysis if available and valid
   */
  async getCachedAnalysis(domain: string, projectId: string): Promise<DomainAnalysisResult | null> {
    const cached = await this.domainAnalysisRepository.getValidAnalysis(domain, projectId);
    if (!cached) return null;

    return this.convertToAnalysisResult(cached, cached.createdAt);
  }

  /**
   * Get all domain analyses for a project
   */
  async getProjectDomainAnalyses(projectId: string): Promise<DomainAnalysisResult[]> {
    const analyses = await this.domainAnalysisRepository.findByProject(projectId);
    return analyses.map(analysis => this.convertToAnalysisResult(analysis, analysis.createdAt));
  }

  /**
   * Force refresh domain analysis
   */
  async refreshDomainAnalysis(input: DomainAnalysisInput): Promise<DomainAnalysisResult> {
    // Delete existing analysis to force refresh
    await this.domainAnalysisRepository.delete(input.domain, input.projectId);
    return this.analyzeDomain(input);
  }

  /**
   * Prepare domain context from all pages
   */
  private async prepareDomainContext(pages: Array<{url: string, html: string, metadata: any}>, projectContext: any) {
    const allPages = [];
    const pageTypes = new Set<string>();
    let representativeSignals: PageSignals | null = null;
    let representativeCategory: PageCategory | null = null;

    for (const page of pages) {
      try {
        // Extract page signals
        const pageSignals = this.pageSignalExtractor.extract(page.html, page.metadata, projectContext);
        
        // Categorize page
        const pageCategory = await this.pageCategorizerService.categorize(
          page.url, 
          page.html, 
          page.metadata
        );

        // Use first page as representative
        if (!representativeSignals) {
          representativeSignals = pageSignals;
          representativeCategory = pageCategory;
        }

        pageTypes.add(pageCategory.type);

        allPages.push({
          url: page.url,
          html: page.html,
          cleanContent: this.pageSignalExtractor.getCleanContent(page.html),
          metadata: page.metadata,
          pageSignals,
          pageCategory
        });
      } catch (error) {
        this.logger.warn(`Error processing page ${page.url} for domain context:`, error);
      }
    }

    return {
      allPages,
      pageTypes: Array.from(pageTypes),
      representativeSignals: representativeSignals!,
      representativeCategory: representativeCategory!
    };
  }

  /**
   * Aggregate rule results by dimension
   */
  private aggregateByDimension(ruleResults: any[]): Record<RuleDimension, any> {
    const dimensions: Record<string, any> = {};

    ruleResults.forEach(result => {
      const dimension = result.dimension;
      if (!dimensions[dimension]) {
        dimensions[dimension] = {
          score: 0,
          weight: 0,
          contribution: 0,
          ruleCount: 0
        };
      }

      dimensions[dimension].score += result.score * result.weight;
      dimensions[dimension].weight += result.weight;
      dimensions[dimension].contribution += result.contribution;
      dimensions[dimension].ruleCount += 1;
    });

    // Calculate weighted averages
    Object.keys(dimensions).forEach(dimension => {
      const dim = dimensions[dimension];
      if (dim.weight > 0) {
        dim.score = Math.round(dim.score / dim.weight);
      }
    });

    return dimensions as Record<RuleDimension, any>;
  }

  /**
   * Calculate overall domain score from dimension scores
   */
  private calculateOverallScore(dimensionResults: Record<string, any>): number {
    const dimensionScores = Object.values(dimensionResults);
    if (dimensionScores.length === 0) return 0;

    const totalWeight = dimensionScores.reduce((sum, dim) => sum + dim.weight, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = dimensionScores.reduce((sum, dim) => sum + (dim.score * dim.weight), 0);
    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Store domain analysis result in database
   */
  private async storeDomainAnalysis(projectId: string, result: DomainAnalysisResult): Promise<void> {
    try {
      await this.domainAnalysisRepository.upsert({
        domain: result.domain,
        projectId,
        analysisResults: {
          authority: result.dimensionScores.authority || {
            score: 0,
            maxScore: 100,
            evidence: [],
            details: {},
            issues: []
          }
        },
        ruleResults: result.ruleResults,
        overallScore: result.overallScore,
        calculationDetails: result.calculationDetails,
        issues: result.issues,
        recommendations: result.recommendations,
        metadata: result.metadata
      });
    } catch (error) {
      this.logger.error(`Error storing domain analysis for ${result.domain}:`, error);
      // Don't throw - analysis was successful, storage is supplementary
    }
  }

  /**
   * Convert database document to analysis result
   */
  private convertToAnalysisResult(doc: any, startTime: Date): DomainAnalysisResult {
    return {
      domain: doc.domain,
      overallScore: doc.overallScore,
      dimensionScores: doc.calculationDetails?.dimensionBreakdown || {},
      ruleResults: doc.ruleResults || [],
      issues: doc.issues || [],
      recommendations: doc.recommendations || [],
      calculationDetails: doc.calculationDetails,
      metadata: doc.metadata || {
        totalPages: 0,
        pagesAnalyzed: [],
        analysisStartedAt: startTime,
        analysisCompletedAt: doc.updatedAt || doc.createdAt,
        llmCallsMade: 0
      }
    };
  }

  /**
   * Create empty result when no domain rules exist
   */
  private createEmptyResult(input: DomainAnalysisInput, startTime: Date): DomainAnalysisResult {
    const endTime = new Date();
    return {
      domain: input.domain,
      overallScore: 50, // Neutral score when no rules
      dimensionScores: {},
      ruleResults: [],
      issues: ['No domain-scoped rules configured'],
      recommendations: ['Configure domain-level analysis rules'],
      calculationDetails: {
        totalWeight: 0,
        weightedScore: 50,
        finalScore: 50,
        dimensionBreakdown: {}
      },
      metadata: {
        totalPages: input.pages.length,
        pagesAnalyzed: input.pages.map(p => p.url),
        analysisStartedAt: startTime,
        analysisCompletedAt: endTime,
        llmCallsMade: 0
      }
    };
  }
}