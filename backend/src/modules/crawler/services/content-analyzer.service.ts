import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrawledPageRepository } from '../repositories/crawled-page.repository';
import { ContentScoreRepository } from '../repositories/content-score.repository';
import { AuthorityAnalyzer } from '../analyzers/authority.analyzer';
import { FreshnessAnalyzer } from '../analyzers/freshness.analyzer';
import { StructureAnalyzer } from '../analyzers/structure.analyzer';
import { SnippetAnalyzer } from '../analyzers/snippet.analyzer';
import { BrandAnalyzer } from '../analyzers/brand.analyzer';
import { ScoringRulesService } from './scoring-rules.service';
import { calculateGlobalScore } from '../config/default-scoring-rules';
import { ContentScore, DimensionDetails, ScoreIssue } from '../schemas/content-score.schema';
import { ProjectService } from '../../project/services/project.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnifiedKPIAnalyzerService } from './unified-kpi-analyzer.service';
import { ContentKPIBudgetManagerService } from './content-kpi-budget-manager.service';
import { PageSignalExtractorService } from './page-signal-extractor.service';

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
    private readonly authorityAnalyzer: AuthorityAnalyzer,
    private readonly freshnessAnalyzer: FreshnessAnalyzer,
    private readonly structureAnalyzer: StructureAnalyzer,
    private readonly snippetAnalyzer: SnippetAnalyzer,
    private readonly brandAnalyzer: BrandAnalyzer,
    private readonly scoringRulesService: ScoringRulesService,
    private readonly projectService: ProjectService,
    private readonly eventEmitter: EventEmitter2,
    private readonly unifiedKPIAnalyzer: UnifiedKPIAnalyzerService,
    private readonly budgetManager: ContentKPIBudgetManagerService,
    private readonly pageSignalExtractor: PageSignalExtractorService,
  ) {}

  async analyzeProjectContent(projectId: string, limit?: number): Promise<void> {
    this.logger.log(`[ANALYZER] Starting content analysis for project ${projectId}`);

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

    try {
      for (const page of pages) {
        progress.currentUrl = page.url;
        this.logger.log(`[ANALYZER] Analyzing page ${progress.analyzed + 1}/${pages.length}: ${page.url}`);
        this.eventEmitter.emit('analyzer.progress', progress);

        try {
          // Analyze the page
          this.logger.debug(`[ANALYZER] Running analyzers for ${page.url}`);
          const score = await this.analyzePage(page, project);
          this.logger.log(`[ANALYZER] Page analyzed - Global Score: ${score.globalScore}, Issues: ${score.issues?.length || 0}`);
          
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
    // Check if unified AI analysis is enabled
    const useUnifiedAI = this.configService.get<boolean>('CONTENT_KPI_USE_AI', false);
    const fallbackToStatic = this.configService.get<boolean>('CONTENT_KPI_FALLBACK_TO_STATIC', true);

    if (useUnifiedAI) {
      try {
        return await this.analyzePageUnified(page, project);
      } catch (error) {
        this.logger.error(`Unified AI analysis failed for ${page.url}:`, error);
        
        if (fallbackToStatic) {
          this.logger.log(`Falling back to static analysis for ${page.url}`);
          return await this.analyzePageStatic(page, project);
        } else {
          throw error;
        }
      }
    } else {
      return await this.analyzePageStatic(page, project);
    }
  }

  /**
   * Unified AI-powered analysis (new approach)
   */
  async analyzePageUnified(page: any, project: any): Promise<Partial<ContentScore>> {
    // Estimate cost first
    const pageSignals = this.pageSignalExtractor.extract(page.html, page.metadata);
    const cleanContent = this.pageSignalExtractor.getCleanContent(page.html);
    const estimatedTokens = this.unifiedKPIAnalyzer.estimateTokenUsage(pageSignals, cleanContent);
    const estimatedCost = this.budgetManager.estimateCost(estimatedTokens * 0.85, estimatedTokens * 0.15); // Rough input/output split

    // Check budget
    const budgetStatus = this.budgetManager.canProceedWithAnalysis(estimatedCost.estimatedCost);
    if (!budgetStatus.canProceed) {
      throw new Error(`Budget limit exceeded: ${budgetStatus.reason}`);
    }

    // Check circuit breaker
    if (this.budgetManager.shouldTriggerCircuitBreaker()) {
      throw new Error('Circuit breaker triggered due to high costs');
    }

    // Perform unified analysis
    const analysisContext = {
      brandName: project.brandName,
      keyBrandAttributes: project.keyBrandAttributes || [],
      competitors: project.competitors || [],
    };

    const result = await this.unifiedKPIAnalyzer.analyze(page.html, page.metadata, analysisContext);

    // Record actual cost (we'll estimate this since we don't have exact token usage from response)
    this.budgetManager.recordActualCost(estimatedCost.estimatedCost);

    // Convert unified result to ContentScore format
    return this.convertUnifiedResultToContentScore(result, page, project);
  }

  /**
   * Convert unified AI result to ContentScore format
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
        authorCredentials: result.details.authority.authorCredentials,
        outboundCitations: result.details.authority.citationCount,
        trustedCitations: result.details.authority.citationCount, // Simplified mapping
      },
      freshness: {
        publishDate: result.details.freshness.publishDate,
        modifiedDate: result.details.freshness.modifiedDate,
        daysSinceUpdate: result.details.freshness.daysSinceUpdate,
        hasDateSignals: result.details.freshness.hasDateSignals,
      },
      structure: {
        h1Count: result.details.structure.h1Count,
        headingHierarchy: result.details.structure.hasSchema, // Mapping schema availability to hierarchy boolean
        schemaTypes: [], // Would need to extract from page signals
        avgSentenceWords: result.details.structure.avgSentenceWords,
      },
      snippet: {
        avgSentenceWords: result.details.snippet.avgSentenceLength,
        listCount: result.details.snippet.listCount,
        qaBlockCount: result.details.snippet.qaBlockCount,
        extractableBlocks: result.details.snippet.extractableBlocks,
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
    };
  }

  /**
   * Static rule-based analysis (original approach)
   */
  async analyzePageStatic(page: any, project: any): Promise<Partial<ContentScore>> {
    const allIssues: ScoreIssue[] = [];

    // Run all analyzers
    const authorityResult = this.authorityAnalyzer.analyze(page.html, page.url);
    const freshnessResult = this.freshnessAnalyzer.analyze(page.html, page.metadata);
    const structureResult = this.structureAnalyzer.analyze(page.html);
    const snippetResult = this.snippetAnalyzer.analyze(page.html);
    const brandResult = this.brandAnalyzer.analyze(
      page.html,
      project.keyBrandAttributes || [],
      project.brandName
    );

    // Collect all issues
    allIssues.push(
      ...authorityResult.issues,
      ...freshnessResult.issues,
      ...structureResult.issues,
      ...snippetResult.issues,
      ...brandResult.issues
    );

    // Prepare dimension scores
    const scores = {
      authority: authorityResult.score,
      freshness: freshnessResult.score,
      structure: structureResult.score,
      snippetExtractability: snippetResult.score,
      brandAlignment: brandResult.score,
    };

    // Calculate global score
    const scoringRules = this.scoringRulesService.getScoringRules();
    const globalScore = calculateGlobalScore(scores, scoringRules);

    // Prepare dimension details
    const details: DimensionDetails = {
      authority: {
        hasAuthor: authorityResult.hasAuthor,
        authorCredentials: authorityResult.authorCredentials,
        outboundCitations: authorityResult.outboundCitations,
        trustedCitations: authorityResult.trustedCitations,
      },
      freshness: {
        publishDate: freshnessResult.publishDate,
        modifiedDate: freshnessResult.modifiedDate,
        daysSinceUpdate: freshnessResult.daysSinceUpdate,
        hasDateSignals: freshnessResult.hasDateSignals,
      },
      structure: {
        h1Count: structureResult.h1Count,
        headingHierarchy: structureResult.headingHierarchy,
        schemaTypes: structureResult.schemaTypes,
        avgSentenceWords: structureResult.avgSentenceWords,
      },
      snippet: {
        avgSentenceWords: snippetResult.avgSentenceWords,
        listCount: snippetResult.listCount,
        qaBlockCount: snippetResult.qaBlockCount,
        extractableBlocks: snippetResult.extractableBlocks,
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

    return {
      projectId: project.projectId,
      url: page.url,
      scores,
      globalScore,
      details,
      issues: allIssues,
      analyzedAt: new Date(),
      crawledPageId: page.id || page._id,
      scoringRulesVersion: {
        version: '1.0.0',
        updatedAt: new Date(),
      },
    };
  }

  async getProjectContentScores(projectId: string): Promise<ContentScore[]> {
    return this.contentScoreRepository.findByProjectId(projectId);
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
   * Get current budget status for monitoring
   */
  getBudgetStatus() {
    return this.budgetManager.getBudgetStatus();
  }

  /**
   * Reset budget for new analysis session
   */
  resetBudget() {
    this.budgetManager.resetBudget();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.budgetManager.getPerformanceMetrics();
  }
}