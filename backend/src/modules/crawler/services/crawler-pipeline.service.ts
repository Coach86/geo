import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebCrawlerService, CrawlOptions } from './web-crawler.service';
import { ContentAnalyzerService } from './content-analyzer.service';
import { AEOContentAnalyzerService } from './aeo-content-analyzer.service';
import { ProjectService } from '../../project/services/project.service';
import { BatchEventsGateway } from '../../batch/gateways/batch-events.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface CrawlerPipelineResult {
  projectId: string;
  crawledPages: number;
  analyzedPages: number;
  avgGlobalScore: number;
  topIssues: Array<{
    dimension: string;
    count: number;
    severity: string;
  }>;
  startedAt: Date;
  completedAt: Date;
  duration: number;
}

@Injectable()
export class CrawlerPipelineService {
  private readonly logger = new Logger(CrawlerPipelineService.name);
  private readonly defaultCrawlOptions: Partial<CrawlOptions>;

  constructor(
    private readonly configService: ConfigService,
    private readonly webCrawlerService: WebCrawlerService,
    private readonly contentAnalyzerService: ContentAnalyzerService,
    private readonly aeoContentAnalyzerService: AEOContentAnalyzerService,
    private readonly projectService: ProjectService,
    private readonly batchEventsGateway: BatchEventsGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.defaultCrawlOptions = {
      maxPages: this.configService.get<number>('CRAWLER_MAX_PAGES_DEFAULT', 100),
      crawlDelay: this.configService.get<number>('CRAWLER_DEFAULT_DELAY_MS', 1000),
      respectRobotsTxt: true,
      timeout: this.configService.get<number>('CRAWLER_TIMEOUT_MS', 30000),
      maxDepth: 5,
    };

    // Set up event listeners for real-time updates
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // The CrawlerEventsGateway already listens to these events and emits them properly
    // We don't need to do anything here since the gateway handles the WebSocket emissions
    // The crawler.* and analyzer.* events are already being emitted by web-crawler.service.ts
    // and content-analyzer.service.ts respectively
  }

  async runContentKPIPipeline(projectId: string, options?: Partial<CrawlOptions>): Promise<CrawlerPipelineResult> {
    const startedAt = new Date();
    this.logger.log(`[PIPELINE] Starting Content KPI pipeline for project ${projectId}`);

    try {
      // Get project details
      this.logger.log(`[PIPELINE] Fetching project details for ${projectId}`);
      const project = await this.projectService.findById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      this.logger.log(`[PIPELINE] Project found: ${project.brandName} - ${project.website}`);

      // Prepare crawl options
      // TODO: In the future, emit an event to check organization limits
      const crawlOptions: CrawlOptions = {
        ...this.defaultCrawlOptions,
        maxPages: options?.maxPages || project.crawlSettings?.maxPages || this.defaultCrawlOptions.maxPages!,
        crawlDelay: options?.crawlDelay || project.crawlSettings?.crawlDelay || this.defaultCrawlOptions.crawlDelay!,
        includePatterns: options?.includePatterns || project.crawlSettings?.includePatterns,
        excludePatterns: options?.excludePatterns || project.crawlSettings?.excludePatterns,
        userAgent: options?.userAgent,
        mode: options?.mode || 'auto',
        manualUrls: options?.manualUrls,
      } as CrawlOptions;
      
      this.logger.log(`[PIPELINE] Crawl options configured: maxPages=${crawlOptions.maxPages}, crawlDelay=${crawlOptions.crawlDelay}ms, mode=${crawlOptions.mode}`);
      if (crawlOptions.mode === 'manual' && crawlOptions.manualUrls) {
        this.logger.log(`[PIPELINE] Manual mode: Will crawl ${crawlOptions.manualUrls.length} specific URLs: ${crawlOptions.manualUrls.join(', ')}`);
      }

      // Step 1: Crawl website
      this.logger.log(`[PIPELINE] Step 1: Starting website crawl for ${project.website} with max ${crawlOptions.maxPages} pages`);
      const crawlStartTime = Date.now();
      await this.webCrawlerService.crawlWebsite(projectId, project.website, crawlOptions);
      const crawlDuration = Date.now() - crawlStartTime;
      this.logger.log(`[PIPELINE] Crawling completed in ${crawlDuration}ms`);

      // Step 2: Analyze crawled content with AEO rules (respecting the same limit as crawling)
      this.logger.log(`[PIPELINE] Step 2: Starting AEO content analysis for KPIs (max ${crawlOptions.maxPages} pages)`);
      const analysisStartTime = Date.now();
      // Pass the mode to the analyzer so it knows whether to preserve existing scores
      await this.aeoContentAnalyzerService.analyzeProjectContent(projectId, crawlOptions.maxPages, crawlOptions.mode);
      const analysisDuration = Date.now() - analysisStartTime;
      this.logger.log(`[PIPELINE] AEO Analysis completed in ${analysisDuration}ms`);

      // Step 3: Get results
      this.logger.log('[PIPELINE] Step 3: Fetching analysis results');
      const stats = await this.aeoContentAnalyzerService.getProjectScoreStats(projectId);
      const crawlStats = await this.webCrawlerService.getCrawlStatus(projectId);
      
      this.logger.log(`[PIPELINE] Results: ${crawlStats.successfulPages} pages crawled, ${stats.totalPages} pages analyzed`);
      this.logger.log(`[PIPELINE] Average global score: ${stats.avgGlobalScore}`);

      // Prepare top issues summary
      const topIssues = stats.issuesSummary
        .slice(0, 5)
        .map((issue: any) => ({
          dimension: issue._id,
          count: issue.totalIssues,
          severity: issue.severities[0]?.severity || 'medium',
        }));
      
      this.logger.log(`[PIPELINE] Top issues identified: ${topIssues.length}`);

      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      const result: CrawlerPipelineResult = {
        projectId,
        crawledPages: crawlStats.successfulPages,
        analyzedPages: stats.totalPages,
        avgGlobalScore: Math.round(stats.avgGlobalScore),
        topIssues,
        startedAt,
        completedAt,
        duration,
      };

      // TODO: Update project with last crawl date when crawlSettings is added to update method

      // Send completion event
      this.logger.log(`[PIPELINE] Sending completion event via WebSocket`);
      this.batchEventsGateway.emitBatchEvent({
        batchExecutionId: 'content-kpi-' + projectId,
        projectId,
        projectName: project.brandName,
        eventType: 'pipeline_completed',
        pipelineType: 'full',
        message: `Analyzed ${result.analyzedPages} pages with avg score ${result.avgGlobalScore}`,
        timestamp: new Date(),
        progress: 100,
      });

      this.logger.log(`[PIPELINE] Pipeline completed successfully in ${duration}ms`);
      return result;
    } catch (error) {
      this.logger.error(`[PIPELINE] Content KPI pipeline failed for project ${projectId}:`, error);
      this.logger.error(`[PIPELINE] Error stack:`, error.stack);
      
      // Send error event
      this.batchEventsGateway.emitBatchEvent({
        batchExecutionId: 'content-kpi-' + projectId,
        projectId,
        projectName: '',
        eventType: 'pipeline_failed',
        pipelineType: 'full',
        message: `Pipeline failed: ${error.message}`,
        timestamp: new Date(),
        progress: 0,
        error: error.message,
      });

      throw error;
    }
  }

  async runForAllProjects(): Promise<Array<CrawlerPipelineResult | { projectId: string; error: string }>> {
    const results: Array<CrawlerPipelineResult | { projectId: string; error: string }> = [];
    
    // Get all active projects
    const projects = await this.projectService.findAll();
    
    for (const project of projects) {
      try {
        // Check if crawling is enabled for this project
        if (project.crawlSettings?.enabled !== false) {
          const result = await this.runContentKPIPipeline(project.projectId);
          results.push(result);
        }
      } catch (error) {
        this.logger.error(`Failed to run content KPI pipeline for project ${project.projectId}:`, error);
        results.push({
          projectId: project.projectId,
          error: error.message,
        });
      }
    }

    return results;
  }

  async getLastPipelineResult(projectId: string): Promise<CrawlerPipelineResult | null> {
    try {
      const stats = await this.aeoContentAnalyzerService.getProjectScoreStats(projectId);
      const crawlStats = await this.webCrawlerService.getCrawlStatus(projectId);

      if (!stats.lastAnalyzedAt) {
        return null;
      }

      const topIssues = stats.issuesSummary
        .slice(0, 5)
        .map((issue: any) => ({
          dimension: issue._id,
          count: issue.totalIssues,
          severity: issue.severities[0]?.severity || 'medium',
        }));

      return {
        projectId,
        crawledPages: crawlStats.successfulPages,
        analyzedPages: stats.totalPages,
        avgGlobalScore: Math.round(stats.avgGlobalScore),
        topIssues,
        startedAt: crawlStats.lastCrawledAt,
        completedAt: stats.lastAnalyzedAt,
        duration: 0, // Not stored, would need to calculate
      };
    } catch (error) {
      return null;
    }
  }
}