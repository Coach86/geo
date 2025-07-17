import { Injectable, Logger } from '@nestjs/common';
import { CrawledPageRepository } from '../repositories/crawled-page.repository';
import { CrawlOrchestrationService } from './crawl-orchestration.service';

export interface CrawlOptions {
  maxPages: number;
  crawlDelay: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  respectRobotsTxt: boolean;
  userAgent?: string;
  timeout?: number;
  maxDepth?: number;
  mode?: 'auto' | 'manual';
  manualUrls?: string[];
}

export interface CrawlProgress {
  crawled: number;
  total: number;
  currentUrl: string;
  errors: number;
  status: 'running' | 'completed' | 'failed';
}

/**
 * Main web crawler service that delegates to specialized services.
 * Maintains backward compatibility while using the new modular structure.
 */
@Injectable()
export class WebCrawlerService {
  private readonly logger = new Logger(WebCrawlerService.name);

  constructor(
    private readonly crawlOrchestrationService: CrawlOrchestrationService,
    private readonly crawledPageRepository: CrawledPageRepository,
  ) {}

  /**
   * Crawl a website starting from the given URL
   * Delegates to CrawlOrchestrationService
   */
  async crawlWebsite(projectId: string, startUrl: string, options: CrawlOptions): Promise<void> {
    return this.crawlOrchestrationService.crawlWebsite(projectId, startUrl, options);
  }


  /**
   * Get crawl status for a project
   * Delegates to CrawlOrchestrationService and repository
   */
  async getCrawlStatus(projectId: string): Promise<any> {
    const stats = await this.crawledPageRepository.getProjectCrawlStats(projectId);
    const crawlStates = this.crawlOrchestrationService.getCrawlStates();
    const crawlQueue = this.crawlOrchestrationService.getCrawlQueue();
    
    const queue = crawlQueue.get(projectId);
    const crawlState = crawlStates.get(projectId);
    
    return {
      ...stats,
      isActive: crawlState !== undefined && crawlState.status === 'running',
      isRunning: queue !== undefined,
      queueSize: queue?.size || 0,
      crawledPages: crawlState?.crawled || stats.successfulPages || 0,
      totalPages: crawlState?.total || stats.totalPages || 0,
    };
  }
}