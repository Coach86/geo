import { Injectable, Logger } from '@nestjs/common';
import { ProjectService } from '../../project/services/project.service';
import { WebCrawlerService } from './web-crawler.service';
import { BM25IndexService } from './bm25-index.service';
import { VectorIndexService } from './vector-index.service';
import { VisibilityScannerService } from './visibility-scanner.service';
import { TextProcessorService } from './text-processor.service';
import { SearchIndexRepository } from '../repositories/search-index.repository';
import { ScanResultRepository } from '../repositories/scan-result.repository';
import { CrawledPageRepository } from '../repositories/crawled-page.repository';
import { BatchEventsGateway } from '../../batch/gateways/batch-events.gateway';

export interface AuditOptions {
  forceRecrawl?: boolean;
  deepAnalysis?: boolean;
  queryCount?: number;
  initialScan?: boolean;
  planUpgrade?: boolean;
}

export interface AuditResult {
  projectId: string;
  success: boolean;
  scanId?: string;
  error?: string;
  crawledPages?: number;
  duration?: number;
}

@Injectable()
export class AIVisibilityOrchestratorService {
  private readonly logger = new Logger(AIVisibilityOrchestratorService.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly webCrawlerService: WebCrawlerService,
    private readonly bm25IndexService: BM25IndexService,
    private readonly vectorIndexService: VectorIndexService,
    private readonly visibilityScannerService: VisibilityScannerService,
    private readonly textProcessorService: TextProcessorService,
    private readonly searchIndexRepository: SearchIndexRepository,
    private readonly scanResultRepository: ScanResultRepository,
    private readonly crawledPageRepository: CrawledPageRepository,
    private readonly batchEventsGateway: BatchEventsGateway,
  ) {}

  /**
   * Orchestrate AI visibility audits for all active projects
   */
  async orchestrateAllProjectAudits(options: AuditOptions = {}): Promise<{
    successful: number;
    failed: number;
    results: AuditResult[];
  }> {
    this.logger.log('Starting AI visibility audit orchestration for all projects');
    
    // Get all active projects
    const projects = await this.projectService.findActiveProjects();
    this.logger.log(`Found ${projects.length} active projects to audit`);

    const results: AuditResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process projects in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < projects.length; i += batchSize) {
      const batch = projects.slice(i, i + batchSize);
      const batchPromises = batch.map(project => 
        this.orchestrateProjectAudit(project.projectId, options)
          .then(result => {
            if (result.success) successful++;
            else failed++;
            results.push(result);
            return result;
          })
          .catch(error => {
            failed++;
            const result: AuditResult = {
              projectId: project.projectId,
              success: false,
              error: error.message,
            };
            results.push(result);
            return result;
          })
      );

      await Promise.all(batchPromises);
      
      // Add delay between batches
      if (i + batchSize < projects.length) {
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
      }
    }

    this.logger.log(`AI visibility audit orchestration completed. Successful: ${successful}, Failed: ${failed}`);
    return { successful, failed, results };
  }

  /**
   * Orchestrate AI visibility audit for a single project
   */
  async orchestrateProjectAudit(
    projectId: string, 
    options: AuditOptions = {}
  ): Promise<AuditResult> {
    const startTime = Date.now();
    this.logger.log(`Starting AI visibility audit for project ${projectId}`);

    try {
      const project = await this.projectService.findById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      if (!project.website) {
        throw new Error(`Project ${projectId} has no website configured`);
      }

      // Step 1: Check if we need to crawl
      const needsCrawl = await this.shouldCrawl(projectId, options);
      let crawlResult;
      
      if (needsCrawl) {
        this.logger.log(`Crawling website for project ${projectId}`);
        
        // Emit audit started event
        this.batchEventsGateway.emitAuditStarted(projectId, {
          forceRecrawl: options.forceRecrawl,
          deepAnalysis: options.deepAnalysis,
        });
        
        crawlResult = await this.webCrawlerService.crawlWebsite(
          projectId,
          project.website,
          {
            maxPages: options.deepAnalysis ? 200 : 100,
            maxDepth: options.deepAnalysis ? 5 : 3,
            respectRobotsTxt: true,
            crawlDelay: 1000,
          }
        );
      }

      // Step 2: Check if we need to build/rebuild indexes
      const needsIndexing = await this.shouldBuildIndexes(projectId, options);
      
      if (needsIndexing) {
        this.logger.log(`Building indexes for project ${projectId}`);
        
        // Get all crawled pages
        const pages = await this.crawledPageRepository.findByProject(projectId);
        if (pages.length === 0) {
          throw new Error('No crawled pages found for indexing');
        }

        // Process pages into chunks
        const chunks = await this.textProcessorService.processPages(pages);
        
        // Build both indexes in parallel
        const [bm25IndexId, vectorIndexId] = await Promise.all([
          this.bm25IndexService.buildIndex(projectId, chunks),
          this.vectorIndexService.buildIndex(projectId, chunks),
        ]);

        this.logger.log(`Indexes built successfully for project ${projectId}`);
      }

      // Step 3: Run visibility scan
      const scanConfig = {
        querySource: 'generated' as any,
        generateQueryCount: options.queryCount || (options.deepAnalysis ? 100 : 50),
        useHybridSearch: true,
        maxResults: 10,
      };

      const scanId = await this.visibilityScannerService.executeScan(projectId, scanConfig);
      
      // Wait for scan to complete (with timeout)
      const scanResult = await this.waitForScanCompletion(scanId, 300000); // 5 minute timeout
      
      const duration = Date.now() - startTime;
      this.logger.log(`AI visibility audit completed for project ${projectId} in ${duration}ms`);

      // Emit audit completed event
      this.batchEventsGateway.emitAuditCompleted(projectId, {
        scanId,
        duration,
        crawledPages: crawlResult?.successfulPages || 0,
      });

      return {
        projectId,
        success: true,
        scanId,
        crawledPages: crawlResult?.successfulPages || 0,
        duration,
      };

    } catch (error) {
      this.logger.error(`AI visibility audit failed for project ${projectId}: ${error.message}`, error.stack);
      
      // Emit audit failed event
      this.batchEventsGateway.emitAuditFailed(projectId, error.message);
      
      return {
        projectId,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Determine if we need to crawl the website
   */
  private async shouldCrawl(projectId: string, options: AuditOptions): Promise<boolean> {
    if (options.forceRecrawl) {
      return true;
    }

    // Check last crawl date
    const lastCrawl = await this.crawledPageRepository.getLastCrawlDate(projectId);
    if (!lastCrawl) {
      return true; // Never crawled
    }

    // Re-crawl if older than 7 days for regular audits, 30 days for deep analysis
    const daysSinceLastCrawl = (Date.now() - lastCrawl.getTime()) / (1000 * 60 * 60 * 24);
    const crawlThreshold = options.deepAnalysis ? 30 : 7;

    return daysSinceLastCrawl > crawlThreshold;
  }

  /**
   * Determine if we need to build/rebuild indexes
   */
  private async shouldBuildIndexes(projectId: string, options: AuditOptions): Promise<boolean> {
    const { bm25, vector } = await this.searchIndexRepository.getLatestIndexes(projectId);
    
    if (!bm25 || !vector) {
      return true; // No indexes exist
    }

    if (bm25.status !== 'ready' || vector.status !== 'ready') {
      return true; // Indexes not ready
    }

    // Check if crawl happened after last index build
    const lastCrawl = await this.crawledPageRepository.getLastCrawlDate(projectId);
    if (lastCrawl && bm25.buildCompletedAt && lastCrawl > bm25.buildCompletedAt) {
      return true; // New content crawled since last index
    }

    // Rebuild indexes for deep analysis
    return options.deepAnalysis || false;
  }

  /**
   * Wait for scan to complete with timeout
   */
  private async waitForScanCompletion(scanId: string, timeout: number): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const scan = await this.visibilityScannerService.getScanResult(scanId);
      
      if (scan && (scan.status === 'completed' || scan.status === 'failed')) {
        return scan;
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Scan ${scanId} timed out after ${timeout}ms`);
  }

  /**
   * Clean up old scans and indexes
   */
  async cleanupOldScans(beforeDate: Date): Promise<{
    deletedScans: number;
    deletedIndexes: number;
  }> {
    this.logger.log(`Cleaning up AI visibility data older than ${beforeDate.toISOString()}`);

    try {
      // Delete old scan results
      const deletedScans = await this.scanResultRepository.deleteOldScans(beforeDate);
      
      // Delete old indexes
      const deletedIndexes = await this.searchIndexRepository.deleteOldIndexes(beforeDate);
      
      // Delete old crawled pages
      const deletedPages = await this.crawledPageRepository.deleteOldPages(beforeDate);
      
      this.logger.log(`Cleanup completed: ${deletedScans} scans, ${deletedIndexes} indexes, ${deletedPages} pages deleted`);
      
      return { deletedScans, deletedIndexes };
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}