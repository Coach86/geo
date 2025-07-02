import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrawledPageRepository } from '../repositories/crawled-page.repository';
import { ContentScoreRepository } from '../repositories/content-score.repository';
import { StructureAnalyzer } from '../analyzers/structure.analyzer';
import { BrandAnalyzer } from '../analyzers/brand.analyzer';
import { ScoringRulesService } from './scoring-rules.service';
import { calculateGlobalScore } from '../config/default-scoring-rules';
import { ContentScore, DimensionDetails, ScoreIssue } from '../schemas/content-score.schema';
import { ProjectService } from '../../project/services/project.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnifiedKPIAnalyzerService } from './unified-kpi-analyzer.service';
import { KPIAnalyzerService } from './kpi-analyzer.service';
import { PageSignalExtractorService } from './page-signal-extractor.service';
import { IssueFactoryService, KPIDimension } from './issue-factory.service';
import { DimensionCalculationDetails } from '../interfaces/score-calculation.interface';
import { PageCategorizerService } from './page-categorizer.service';
import { PageCategoryType } from '../interfaces/page-category.interface';
import { LLMCallTrackerService } from './llm-call-tracker.service';
import { DomainAnalysisService } from './domain-analysis.service';

export interface AnalysisProgress {
  projectId: string;
  analyzed: number;
  total: number;
  currentUrl: string;
  status: 'running' | 'completed' | 'failed';
}

@Injectable()
export class ContentAnalyzerService {
  private readonly logger = new Logger(ContentAnalyzerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly crawledPageRepository: CrawledPageRepository,
    private readonly contentScoreRepository: ContentScoreRepository,
    private readonly structureAnalyzer: StructureAnalyzer,
    private readonly brandAnalyzer: BrandAnalyzer,
    private readonly scoringRulesService: ScoringRulesService,
    private readonly projectService: ProjectService,
    private readonly eventEmitter: EventEmitter2,
    private readonly unifiedKPIAnalyzer: UnifiedKPIAnalyzerService,
    private readonly kpiAnalyzer: KPIAnalyzerService,
    private readonly pageSignalExtractor: PageSignalExtractorService,
    private readonly issueFactory: IssueFactoryService,
    private readonly pageCategorizerService: PageCategorizerService,
    private readonly llmCallTracker: LLMCallTrackerService,
    private readonly domainAnalysisService: DomainAnalysisService,
  ) {}

  async analyzeProjectContent(projectId: string, limit?: number): Promise<void> {
    this.logger.log(`[ANALYZER] Starting content analysis for project ${projectId}`);

    // Clear existing analysis data to ensure fresh results
    this.logger.log(`[ANALYZER] Clearing existing content scores for project ${projectId}`);
    await this.contentScoreRepository.deleteByProjectId(projectId);
    

    // Get project details for brand analysis
    this.logger.log(`[ANALYZER] Fetching project details for ${projectId}`);
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    this.logger.log(`[ANALYZER] Project found: ${project.brandName}, Brand Keywords: ${project.keyBrandAttributes?.length || 0}`);

    // Get unprocessed crawled pages
    this.logger.log(`[ANALYZER] Fetching unprocessed crawled pages`);
    const pages = await this.crawledPageRepository.findUnprocessedByProjectId(projectId, limit);
    
    if (pages.length === 0) {
      this.logger.log('[ANALYZER] No unprocessed pages found');
      return;
    }
    
    this.logger.log(`[ANALYZER] Found ${pages.length} unprocessed pages to analyze`);

    const progress: AnalysisProgress = {
      projectId,
      analyzed: 0,
      total: pages.length,
      currentUrl: '',
      status: 'running',
    };

    this.eventEmitter.emit('analyzer.started', { projectId, totalPages: pages.length });
    this.logger.log(`[ANALYZER] Emitted analyzer.started event`);

    // Run domain analysis first
    await this.runDomainAnalysis(projectId, pages, project);

    try {
      for (const page of pages) {
        progress.currentUrl = page.url;
        this.logger.log(`[ANALYZER] Analyzing page ${progress.analyzed + 1}/${pages.length}: ${page.url}`);
        this.eventEmitter.emit('analyzer.progress', progress);

        try {
          // Analyze the page
          this.logger.debug(`[ANALYZER] Running analyzers for ${page.url}`);
          const score = await this.analyzePage(page, project);
          this.logger.log(`[ANALYZER] Page analyzed - Global Score: ${score.globalScore}, Issues: ${score.issues?.length || 0}, Analysis Type: ${score.llmAnalysis?.analysisType || 'unknown'}`);
          
          // Save the score
          this.logger.debug(`[ANALYZER] Saving score to database`);
          await this.contentScoreRepository.upsert(projectId, page.url, score);
          
          // Mark page as processed
          this.logger.debug(`[ANALYZER] Marking page as processed`);
          await this.crawledPageRepository.updateProcessedStatus(page.id || page._id, true);
          
          progress.analyzed++;
          
          this.eventEmitter.emit('analyzer.page_analyzed', {
            projectId,
            url: page.url,
            globalScore: score.globalScore,
          });
        } catch (error) {
          this.logger.error(`[ANALYZER] Error analyzing page ${page.url}:`, error);
          // Continue with next page
        }
      }

      progress.status = 'completed';
      this.logger.log(`[ANALYZER] Analysis completed - Analyzed ${progress.analyzed} pages`);
      this.eventEmitter.emit('analyzer.completed', progress);
    } catch (error) {
      progress.status = 'failed';
      this.logger.error(`[ANALYZER] Analysis failed:`, error);
      this.eventEmitter.emit('analyzer.failed', { progress, error });
      throw error;
    }
  }

  async analyzePage(page: any, project: any): Promise<Partial<ContentScore>> {
    // Start tracking LLM calls for this page
    this.llmCallTracker.startTracking(page.url);
    
    try {
      // First, categorize the page to check if it should be excluded
      const pageCategory = await this.pageCategorizerService.categorize(page.url, page.html, page.metadata);
    
    // Check if this page type should be skipped
    if (pageCategory.type === PageCategoryType.LEGAL_POLICY || pageCategory.type === PageCategoryType.LOGIN_ACCOUNT) {
      this.logger.log(`[ANALYZER] Skipping ${pageCategory.type} page: ${page.url}`);
      
      // Return a minimal score object for skipped pages
      return {
        url: page.url,
        projectId: project.id || project._id,
        globalScore: 0,
        scores: {
          authority: 0,
          freshness: 0,
          structure: 0,
          brandAlignment: 0,
        },
        skipped: true,
        skipReason: `${pageCategory.type} pages are excluded from analysis`,
        pageCategory: pageCategory.type,
        analysisLevel: 'excluded',
        categoryConfidence: pageCategory.confidence,
      } as any;
    }
    
    let result: Partial<ContentScore>;
    
    try {
      // Always use hybrid approach (static + targeted LLM)
      result = await this.analyzePageHybrid(page, project);
    } catch (error) {
      this.logger.error(`Hybrid analysis failed for ${page.url}:`, error);
      throw error;
    }
    
    // Add LLM calls to the result
    const llmCalls = this.llmCallTracker.getCalls(page.url);
    if (llmCalls.length > 0) {
      result.llmCalls = llmCalls;
    }
    
    return result;
    } finally {
      // Clean up tracking for this URL
      this.llmCallTracker.clearTracking(page.url);
    }
  }

  /**
   * Hybrid analysis (static + targeted LLM)
   */
  async analyzePageHybrid(page: any, project: any): Promise<Partial<ContentScore>> {
    this.logger.log(`[ANALYZER] Starting hybrid AI analysis (static + targeted LLM) for ${page.url}`);

    // Perform hybrid analysis (static + targeted LLM)
    const analysisContext = {
      brandName: project.brandName,
      keyBrandAttributes: project.keyBrandAttributes || [],
      competitors: project.competitors || [],
    };

    const result = await this.kpiAnalyzer.analyze(page.html, page.metadata, analysisContext, page.url);

    // Convert hybrid result to ContentScore format
    return this.convertHybridResultToContentScore(result, page, project);
  }

  /**
   * Unified AI-powered analysis (legacy approach - full LLM)
   */
  async analyzePageUnified(page: any, project: any): Promise<Partial<ContentScore>> {
    this.logger.log(`[ANALYZER] Starting unified AI analysis (full LLM) for ${page.url}`);

    // Perform unified analysis
    const analysisContext = {
      brandName: project.brandName,
      keyBrandAttributes: project.keyBrandAttributes || [],
      competitors: project.competitors || [],
    };

    const result = await this.unifiedKPIAnalyzer.analyze(page.html, page.metadata, analysisContext, page.url);

    // Convert unified result to ContentScore format
    return this.convertUnifiedResultToContentScore(result, page, project);
  }

  /**
   * Convert hybrid analysis result to ContentScore format
   */
  private convertHybridResultToContentScore(
    result: any,
    page: any,
    project: any
  ): Partial<ContentScore> {
    // Convert hybrid issues to ContentScore issues
    const issues: ScoreIssue[] = [...result.issues.map((issue: any) => ({
      dimension: issue.dimension,
      severity: issue.severity,
      description: issue.description,
      recommendation: issue.recommendation,
    }))];

    // CRITICAL FIX: Generate issues for static dimensions with low scores
    // This ensures pages with terrible static scores (freshness, structure, snippet) show issues
    const staticDimensions: { [key: string]: KPIDimension } = {
      freshness: 'freshness',
      structure: 'structure', 
    };

    for (const [scoreName, dimensionName] of Object.entries(staticDimensions)) {
      const score = result.scores[scoreName];
      if (score !== undefined) {
        const staticIssues = this.issueFactory.generateIssuesFromScore(dimensionName, score);
        issues.push(...staticIssues);
      }
    }

    // Prepare dimension details (hybrid combines static + LLM details)
    const details: DimensionDetails = {
      authority: {
        hasAuthor: result.details.authority.hasAuthor,
        authorName: result.details.authority.authorName,
        // CRITICAL FIX: Only add credentials if author exists AND has credentials
        authorCredentials: (() => {
          const shouldHaveCredentials = result.details.authority.hasAuthor && result.details.authority.authorCredentials;
          if (!result.details.authority.hasAuthor && result.details.authority.authorCredentials) {
            this.logger.warn(`[AUTHOR-CONSISTENCY] Inconsistency detected: hasAuthor=false but authorCredentials=true. Fixing to empty array.`);
          }
          return shouldHaveCredentials ? [result.details.authority.authorName || 'expert'] : [];
        })(),
        outboundCitations: result.details.authority.citationCount,
        trustedCitations: result.details.authority.citationCount > 0 ? ['external'] : [],
        domainAuthority: result.details.authority.domainAuthority,
        citationCount: result.details.authority.citationCount,
      },
      freshness: {
        publishDate: this.parseValidDate(result.details.freshness.publishDate),
        modifiedDate: this.parseValidDate(result.details.freshness.modifiedDate),
        daysSinceUpdate: result.details.freshness.daysSinceUpdate,
        hasDateSignals: result.details.freshness.hasDateSignals,
      },
      structure: {
        h1Count: result.details.structure.h1Count,
        headingHierarchy: result.details.structure.headingHierarchyScore > 70,
        headingHierarchyScore: result.details.structure.headingHierarchyScore, // Pass the actual score
        schemaTypes: result.details.structure.hasSchema ? ['WebPage'] : [],
        avgSentenceWords: result.details.structure.avgSentenceWords,
      },
      brand: {
        brandKeywordMatches: result.details.brand.brandMentions,
        requiredTermsFound: result.details.brand.missingKeywords || [],
        outdatedTermsFound: result.details.brand.alignmentIssues || [],
        brandConsistency: result.details.brand.consistencyScore,
      },
    };

    // Calculate global score using scoring rules
    const scoringRules = this.scoringRulesService.getScoringRules();
    const globalScore = calculateGlobalScore(result.scores, scoringRules);

    return {
      projectId: project.projectId,
      url: page.url,
      scores: result.scores,
      globalScore,
      details,
      calculationDetails: result.calculationDetails,
      issues,
      analyzedAt: new Date(),
      crawledPageId: page.id || page._id,
      scoringRulesVersion: {
        version: '3.0.0-hybrid',
        updatedAt: new Date(),
      },
      llmAnalysis: result.llmData ? {
        prompt: result.llmData.prompt,
        response: result.llmData.response,
        model: result.llmData.model,
        timestamp: new Date(),
        tokensUsed: result.llmData.tokensUsed,
        analysisType: 'unified' as const, // Keep same for compatibility
      } : undefined,
      pageCategory: result.pageCategory?.type,
      analysisLevel: result.pageCategory?.analysisLevel,
      categoryConfidence: result.pageCategory?.confidence,
    };
  }

  /**
   * Convert unified AI result to ContentScore format (legacy)
   */
  private convertUnifiedResultToContentScore(
    result: any,
    page: any,
    project: any
  ): Partial<ContentScore> {
    // Convert unified issues to ContentScore issues
    const issues: ScoreIssue[] = result.issues.map((issue: any) => ({
      dimension: issue.dimension,
      severity: issue.severity,
      description: issue.description,
      recommendation: issue.recommendation,
    }));

    // Prepare dimension details
    const details: DimensionDetails = {
      authority: {
        hasAuthor: result.details.authority.hasAuthor,
        authorName: result.details.authority.authorName,
        // CRITICAL FIX: Convert boolean to array AND enforce consistency
        authorCredentials: (() => {
          const shouldHaveCredentials = result.details.authority.hasAuthor && result.details.authority.authorCredentials;
          if (!result.details.authority.hasAuthor && result.details.authority.authorCredentials) {
            this.logger.warn(`[UNIFIED-AUTHOR-CONSISTENCY] Inconsistency detected: hasAuthor=false but authorCredentials=true. Fixing to empty array.`);
          }
          return shouldHaveCredentials ? [result.details.authority.authorName || 'expert'] : [];
        })(),
        outboundCitations: result.details.authority.citationCount,
        trustedCitations: result.details.authority.citationCount, // Simplified mapping
        domainAuthority: result.details.authority.domainAuthority,
        citationCount: result.details.authority.citationCount,
      },
      freshness: {
        publishDate: this.parseValidDate(result.details.freshness.publishDate),
        modifiedDate: this.parseValidDate(result.details.freshness.modifiedDate),
        daysSinceUpdate: result.details.freshness.daysSinceUpdate,
        hasDateSignals: result.details.freshness.hasDateSignals,
      },
      structure: {
        h1Count: result.details.structure.h1Count,
        headingHierarchy: result.details.structure.hasSchema, // Mapping schema availability to hierarchy boolean
        schemaTypes: [], // Would need to extract from page signals
        avgSentenceWords: result.details.structure.avgSentenceWords,
      },
      brand: {
        brandKeywordMatches: result.details.brand.brandMentions,
        requiredTermsFound: result.details.brand.missingKeywords || [],
        outdatedTermsFound: result.details.brand.alignmentIssues,
        brandConsistency: result.details.brand.consistencyScore,
      },
    };

    // Calculate global score using scoring rules
    const scoringRules = this.scoringRulesService.getScoringRules();
    const globalScore = calculateGlobalScore(result.scores, scoringRules);

    return {
      projectId: project.projectId,
      url: page.url,
      scores: result.scores,
      globalScore,
      details,
      issues,
      analyzedAt: new Date(),
      crawledPageId: page.id || page._id,
      scoringRulesVersion: {
        version: '2.0.0-unified',
        updatedAt: new Date(),
      },
      llmAnalysis: result.llmData ? {
        prompt: result.llmData.prompt,
        response: result.llmData.response,
        model: result.llmData.model,
        timestamp: new Date(),
        tokensUsed: result.llmData.tokensUsed,
        analysisType: 'unified' as const,
      } : undefined,
    };
  }

  /**
   * Static rule-based analysis (original approach)
   * @deprecated Use analyzePageHybrid instead
   */
  async analyzePageStatic(page: any, project: any): Promise<Partial<ContentScore>> {
    const allIssues: ScoreIssue[] = [];

    // This method is deprecated - use hybrid analysis instead
    // Returning minimal results to avoid breaking existing code
    return {
      scores: {
        authority: 0,
        freshness: 0,
        structure: 0,
        brandAlignment: 0
      },
      details: {
        authority: {
          hasAuthor: false,
          authorCredentials: [],
          outboundCitations: 0,
          trustedCitations: []
        },
        freshness: {
          hasDateSignals: false
        },
        structure: {
          h1Count: 0,
          headingHierarchy: false,
          schemaTypes: [],
          avgSentenceWords: 0
        },
        brand: {
          requiredTermsFound: [],
          outdatedTermsFound: [],
          brandConsistency: 0,
          brandKeywordMatches: 0
        }
      },
      issues: []
    };
    
    /* Old implementation - kept for reference
    const authorityResult = this.authorityAnalyzer.analyze(page.html, page.url);
    const freshnessResult = this.freshnessAnalyzer.analyze(page.html, page.metadata);
    const structureResult = this.structureAnalyzer.analyze(page.html);
    const brandResult = this.brandAnalyzer.analyze(
      page.html,
      project.keyBrandAttributes || [],
      project.brandName
    );

    // Collect all issues from individual analyzers
    allIssues.push(
      ...authorityResult.issues,
      ...freshnessResult.issues,
      ...structureResult.issues,
      ...brandResult.issues
    );

    // Prepare dimension scores
    const scores = {
      authority: authorityResult.score,
      freshness: freshnessResult.score,
      structure: structureResult.score,
      brandAlignment: brandResult.score,
    };

    // CRITICAL FIX: Add issues for any dimension with low scores
    // This ensures static analysis also generates issues for poor scores
    const dimensionMap: { [key: string]: KPIDimension } = {
      authority: 'authority',
      freshness: 'freshness',
      structure: 'structure',
      brandAlignment: 'brandAlignment'
    };

    for (const [scoreName, dimensionName] of Object.entries(dimensionMap)) {
      const score = scores[scoreName as keyof typeof scores];
      if (score !== undefined) {
        const factoryIssues = this.issueFactory.generateIssuesFromScore(dimensionName, score);
        // Only add factory issues if no analyzer-specific issues exist for this dimension
        const hasExistingIssues = allIssues.some(issue => issue.dimension === dimensionName);
        if (!hasExistingIssues) {
          allIssues.push(...factoryIssues);
        }
      }
    }

    // Calculate global score
    const scoringRules = this.scoringRulesService.getScoringRules();
    const globalScore = calculateGlobalScore(scores, scoringRules);

    // Prepare dimension details
    const details: DimensionDetails = {
      authority: {
        hasAuthor: authorityResult.hasAuthor,
        authorName: undefined, // Static analysis doesn't extract author names
        authorCredentials: authorityResult.authorCredentials,
        outboundCitations: authorityResult.outboundCitations,
        trustedCitations: authorityResult.trustedCitations,
        domainAuthority: 'unknown', // Static analysis can't determine domain authority
        citationCount: authorityResult.outboundCitations,
      },
      freshness: {
        publishDate: this.parseValidDate(freshnessResult.publishDate?.toISOString()),
        modifiedDate: this.parseValidDate(freshnessResult.modifiedDate?.toISOString()),
        daysSinceUpdate: freshnessResult.daysSinceUpdate,
        hasDateSignals: freshnessResult.hasDateSignals,
      },
      structure: {
        h1Count: structureResult.h1Count,
        headingHierarchy: structureResult.headingHierarchy,
        headingHierarchyScore: structureResult.headingHierarchyScore,
        schemaTypes: structureResult.schemaTypes,
        avgSentenceWords: structureResult.avgSentenceWords,
      },
      brand: {
        brandKeywordMatches: brandResult.brandKeywordMatches,
        requiredTermsFound: brandResult.requiredTermsFound,
        outdatedTermsFound: brandResult.outdatedTermsFound,
        brandConsistency: brandResult.brandConsistency,
      },
    };

    // Sort issues by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Collect calculation details if available
    const calculationDetails: DimensionCalculationDetails = {
      authority: authorityResult.calculationDetails,
      freshness: freshnessResult.calculationDetails,
      structure: structureResult.calculationDetails,
      brandAlignment: brandResult.calculationDetails,
    };

    return {
      projectId: project.projectId,
      url: page.url,
      scores,
      globalScore,
      details,
      calculationDetails,
      issues: allIssues,
      analyzedAt: new Date(),
      crawledPageId: page.id || page._id,
      scoringRulesVersion: {
        version: '1.0.0',
        updatedAt: new Date(),
      },
      llmAnalysis: {
        prompt: 'Static rule-based analysis - no LLM prompt used',
        response: 'Static rule-based analysis - no LLM response',
        model: 'none',
        timestamp: new Date(),
        analysisType: 'static' as const,
      },
    };
    */
  }

  async getProjectContentScores(projectId: string): Promise<ContentScore[]> {
    return this.contentScoreRepository.findByProjectId(projectId);
  }

  async getPageContentScore(projectId: string, url: string): Promise<ContentScore | null> {
    const scores = await this.contentScoreRepository.findByProjectId(projectId);
    return scores.find(score => score.url === url) || null;
  }

  async getProjectScoreStats(projectId: string): Promise<any> {
    const stats = await this.contentScoreRepository.getProjectScoreStats(projectId);
    const distribution = await this.contentScoreRepository.getScoreDistribution(projectId);
    const issuesSummary = await this.contentScoreRepository.getIssuesSummary(projectId);

    return {
      ...stats,
      scoreDistribution: distribution,
      issuesSummary,
    };
  }

  async getTopPerformingPages(projectId: string, limit: number = 10): Promise<ContentScore[]> {
    return this.contentScoreRepository.findTopScoresByProjectId(projectId, limit);
  }

  async getLowPerformingPages(projectId: string, limit: number = 10): Promise<ContentScore[]> {
    return this.contentScoreRepository.findLowScoresByProjectId(projectId, limit);
  }

  async getPagesWithIssues(projectId: string, severity?: string): Promise<ContentScore[]> {
    return this.contentScoreRepository.findByProjectIdWithIssues(projectId, severity);
  }

  async reanalyzeUrl(projectId: string, url: string): Promise<ContentScore | null> {
    // Get the crawled page
    const crawledPage = await this.crawledPageRepository.findByProjectIdAndUrl(projectId, url);
    if (!crawledPage) {
      throw new Error(`Crawled page not found for URL: ${url}`);
    }

    // Get project details
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Reanalyze
    const score = await this.analyzePage(crawledPage, project);
    
    // Save updated score
    return this.contentScoreRepository.upsert(projectId, url, score);
  }

  /**
   * Safely parse date strings to avoid epoch date issues
   */
  private parseValidDate(dateStr?: string): Date | undefined {
    if (!dateStr) return undefined;
    
    try {
      const parsed = new Date(dateStr);
      
      // Check if date is valid and not epoch date
      if (isNaN(parsed.getTime()) || parsed.getTime() === 0) {
        this.logger.warn(`Invalid date detected and rejected: ${dateStr}`);
        return undefined;
      }
      
      // Check if date is reasonable (between 2000 and current year + 5)
      const year = parsed.getFullYear();
      const currentYear = new Date().getFullYear();
      if (year < 2000 || year > currentYear + 5) {
        this.logger.warn(`Date outside reasonable range and rejected: ${dateStr} (year: ${year})`);
        return undefined;
      }
      
      return parsed;
    } catch (error) {
      this.logger.warn(`Failed to parse date: ${dateStr}`, error);
      return undefined;
    }
  }

  /**
   * Run domain analysis for all unique domains in the project
   */
  private async runDomainAnalysis(projectId: string, pages: any[], project: any): Promise<void> {
    this.logger.log(`[DOMAIN-ANALYZER] Starting domain analysis for project ${projectId}`);

    try {
      // Extract unique domains from pages
      const domainPages: Record<string, any[]> = {};
      
      for (const page of pages) {
        const domain = this.extractDomain(page.url);
        if (!domainPages[domain]) {
          domainPages[domain] = [];
        }
        domainPages[domain].push({
          url: page.url,
          html: page.html,
          metadata: page.metadata || {}
        });
      }

      const domains = Object.keys(domainPages);
      this.logger.log(`[DOMAIN-ANALYZER] Found ${domains.length} unique domains: ${domains.join(', ')}`);

      // Analyze each domain
      for (const domain of domains) {
        this.logger.log(`[DOMAIN-ANALYZER] Analyzing domain: ${domain} (${domainPages[domain].length} pages)`);
        
        try {
          await this.domainAnalysisService.analyzeDomain({
            domain,
            projectId,
            projectContext: {
              brandName: project.brandName,
              keyBrandAttributes: project.keyBrandAttributes || [],
              competitors: project.competitors || []
            },
            pages: domainPages[domain]
          });
          
          this.logger.log(`[DOMAIN-ANALYZER] Domain analysis completed for: ${domain}`);
        } catch (error) {
          this.logger.error(`[DOMAIN-ANALYZER] Error analyzing domain ${domain}:`, error);
          // Continue with other domains even if one fails
        }
      }

      this.logger.log(`[DOMAIN-ANALYZER] Domain analysis completed for all domains`);
    } catch (error) {
      this.logger.error(`[DOMAIN-ANALYZER] Error in domain analysis:`, error);
      // Don't throw - domain analysis failure shouldn't stop page analysis
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.toLowerCase();
    } catch {
      return url.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    }
  }

}