import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrawlOptions, CrawlProgress } from './web-crawler.service';
import { PageExtractionService } from './page-extraction.service';
import { SitemapDiscoveryService } from './sitemap-discovery.service';

/**
 * Service responsible for orchestrating web crawling operations.
 * Handles the main crawl flow, progress tracking, and event emission.
 */
@Injectable()
export class CrawlOrchestrationService {
  private readonly logger = new Logger(CrawlOrchestrationService.name);
  private crawlQueue: Map<string, Set<string>> = new Map(); // projectId -> URLs to crawl
  private crawledUrls: Map<string, Set<string>> = new Map(); // projectId -> crawled URLs
  private crawlStates: Map<string, CrawlProgress> = new Map(); // projectId -> current crawl state

  constructor(
    private readonly pageExtractionService: PageExtractionService,
    private readonly sitemapDiscoveryService: SitemapDiscoveryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async crawlWebsite(projectId: string, startUrl: string, options: CrawlOptions): Promise<void> {
    this.logger.log(`[CRAWLER] Starting crawl for project ${projectId}`);
    this.logger.log(`[CRAWLER] URL: ${startUrl}`);
    this.logger.log(`[CRAWLER] Max pages: ${options.maxPages}`);
    this.logger.log(`[CRAWLER] Crawl delay: ${options.crawlDelay}ms`);
    if (options.userAgent) {
      this.logger.log(`[CRAWLER] Custom user-agent: ${options.userAgent}`);
    }
    
    // Normalize the start URL
    const normalizedStartUrl = this.normalizeUrl(startUrl);
    this.logger.log(`[CRAWLER] Normalized start URL: ${normalizedStartUrl}`);
    
    // Initialize crawl state
    if (options.mode === 'manual' && options.manualUrls) {
      // For manual mode, add all manual URLs to the queue
      const normalizedUrls = options.manualUrls.map(url => this.normalizeUrl(url));
      this.crawlQueue.set(projectId, new Set(normalizedUrls));
      this.logger.log(`[CRAWLER] Manual mode: Added ${normalizedUrls.length} URLs to queue`);
      // In manual mode, only crawl the specifically requested URLs
    } else {
      // For auto mode, start with the normalized URL and discover more
      this.crawlQueue.set(projectId, new Set([normalizedStartUrl]));
      // Try to discover URLs from sitemap first
      await this.sitemapDiscoveryService.discoverUrlsFromSitemap(projectId, startUrl, options, this.crawlQueue, this.crawledUrls);
    }
    this.crawledUrls.set(projectId, new Set());

    const progress: CrawlProgress = {
      crawled: 0,
      total: options.maxPages,
      currentUrl: startUrl,
      errors: 0,
      status: 'running',
    };

    // Store crawl state
    this.crawlStates.set(projectId, progress);

    // Emit start event
    this.eventEmitter.emit('crawler.started', { 
      projectId, 
      startUrl, 
      options,
      maxPages: options.maxPages,
      total: options.maxPages,
    });
    this.logger.log(`[CRAWLER] Emitted crawler.started event with maxPages: ${options.maxPages}`);

    try {
      // Parse robots.txt if needed
      if (options.respectRobotsTxt) {
        await this.pageExtractionService.loadRobotsTxt(normalizedStartUrl);
      }

      // Randomize the crawl queue to avoid crawling all pages from same section
      // Ensure homepage is always first (except in manual mode)
      this.randomizeCrawlQueue(projectId, normalizedStartUrl, options.mode);
      
      // Start crawling
      this.logger.log(`[CRAWLER] Starting crawl loop for project ${projectId}`);
      while (
        (this.crawlQueue.get(projectId)?.size || 0) > 0 &&
        progress.crawled < options.maxPages
      ) {
        // Get next URL from queue
        const queue = this.crawlQueue.get(projectId)!;
        const url = queue.values().next().value;
        queue.delete(url);
        
        // Normalize the URL for consistent checking
        const normalizedUrl = this.normalizeUrl(url);
        
        this.logger.log(`[CRAWLER] Processing URL ${progress.crawled + 1}/${options.maxPages}: ${normalizedUrl}`);

        // Skip if already crawled (check with normalized URL)
        if (this.crawledUrls.get(projectId)?.has(normalizedUrl)) {
          this.logger.debug(`[CRAWLER] Skipping ${normalizedUrl} - already crawled`);
          continue;
        }

        // Check robots.txt
        if (options.respectRobotsTxt && !this.pageExtractionService.isAllowedByRobots(normalizedUrl)) {
          this.logger.log(`[CRAWLER] Skipping ${normalizedUrl} - blocked by robots.txt`);
          continue;
        }

        // Check patterns
        if (!this.matchesPatterns(normalizedUrl, options.includePatterns, options.excludePatterns)) {
          this.logger.debug(`[CRAWLER] Skipping ${normalizedUrl} - doesn't match patterns`);
          continue;
        }

        // Update progress
        progress.currentUrl = normalizedUrl;
        this.eventEmitter.emit('crawler.progress', { 
          projectId, 
          crawled: progress.crawled,
          total: progress.total,
          currentUrl: normalizedUrl,
          progress 
        });
        this.logger.log(`[CRAWLER] Emitted crawler.progress event: ${progress.crawled}/${progress.total}`);

        // Wait for rate limiting
        await this.pageExtractionService.waitForRateLimit(options.crawlDelay);

        // Crawl the page
        try {
          await this.pageExtractionService.crawlPage(
            projectId, 
            normalizedUrl, 
            normalizedStartUrl, 
            options,
            this.crawlQueue,
            this.crawlStates
          );
          this.crawledUrls.get(projectId)?.add(normalizedUrl);
          progress.crawled++;
        } catch (error) {
          this.logger.error(`Error crawling ${normalizedUrl}:`, error);
          progress.errors++;
        }
      }

      progress.status = 'completed';
      this.eventEmitter.emit('crawler.completed', { 
        projectId, 
        crawled: progress.crawled,
        total: progress.total,
        progress 
      });
    } catch (error) {
      progress.status = 'failed';
      this.eventEmitter.emit('crawler.failed', { 
        projectId, 
        crawled: progress.crawled,
        total: progress.total,
        progress, 
        error 
      });
      throw error;
    } finally {
      // Cleanup
      this.crawlQueue.delete(projectId);
      this.crawledUrls.delete(projectId);
      this.crawlStates.delete(projectId);
    }
  }

  private matchesPatterns(
    url: string,
    includePatterns?: string[],
    excludePatterns?: string[],
  ): boolean {
    // Check exclude patterns first
    if (excludePatterns) {
      for (const pattern of excludePatterns) {
        if (url.match(new RegExp(pattern))) {
          return false;
        }
      }
    }

    // Check include patterns
    if (includePatterns && includePatterns.length > 0) {
      for (const pattern of includePatterns) {
        if (url.match(new RegExp(pattern))) {
          return true;
        }
      }
      return false; // Didn't match any include pattern
    }

    return true; // No patterns specified, include all
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove hash fragment
      urlObj.hash = '';
      // Remove trailing slash from pathname (except for root path)
      if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      }
      // Sort query parameters for consistency
      const params = new URLSearchParams(urlObj.search);
      const sortedParams = new URLSearchParams([...params.entries()].sort());
      urlObj.search = sortedParams.toString();
      
      return urlObj.toString();
    } catch (error) {
      // Return original URL if parsing fails
      return url;
    }
  }

  /**
   * Randomize the crawl queue to avoid crawling all pages from the same section
   * Always ensures the homepage is first in the queue for analysis (except in manual mode)
   */
  private randomizeCrawlQueue(projectId: string, homepageUrl: string, mode?: 'auto' | 'manual'): void {
    const queue = this.crawlQueue.get(projectId);
    if (!queue || queue.size <= 1) {
      return;
    }

    // Convert Set to Array
    const urls = Array.from(queue);
    this.logger.log(`[CRAWLER] Randomizing crawl queue with ${urls.length} URLs (mode: ${mode || 'auto'})`);
    
    // In manual mode, just shuffle all URLs without homepage prioritization
    if (mode === 'manual') {
      // Shuffle all URLs using Fisher-Yates algorithm
      for (let i = urls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [urls[i], urls[j]] = [urls[j], urls[i]];
      }
      
      // Clear and rebuild the queue with shuffled URLs
      queue.clear();
      urls.forEach(url => queue.add(url));
      
      this.logger.log(`[CRAWLER] Manual mode: Randomized ${urls.length} URLs without homepage prioritization`);
      return;
    }
    
    // For auto mode, ensure homepage is first
    const homepageIndex = urls.findIndex(url => {
      const normalizedUrl = this.normalizeUrl(url);
      const normalizedHomepage = this.normalizeUrl(homepageUrl);
      return this.isHomepageUrl(normalizedUrl, normalizedHomepage);
    });
    
    let homepage: string | null = null;
    let otherUrls: string[] = [];
    
    if (homepageIndex !== -1) {
      homepage = urls[homepageIndex];
      otherUrls = urls.filter((_, index) => index !== homepageIndex);
    } else {
      // If homepage not found in queue, add it
      homepage = homepageUrl;
      otherUrls = urls;
      this.logger.log(`[CRAWLER] Homepage not found in queue, adding: ${homepageUrl}`);
    }
    
    // Shuffle only the non-homepage URLs using Fisher-Yates algorithm
    for (let i = otherUrls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherUrls[i], otherUrls[j]] = [otherUrls[j], otherUrls[i]];
    }

    // Clear and rebuild the queue with homepage first, then shuffled URLs
    queue.clear();
    
    // Always add homepage first
    if (homepage) {
      queue.add(homepage);
    }
    
    // Add shuffled remaining URLs
    otherUrls.forEach(url => queue.add(url));
    
    this.logger.log(`[CRAWLER] Queue randomized successfully with homepage prioritized`);
  }

  /**
   * Check if a URL is the homepage URL
   */
  private isHomepageUrl(url: string, homepageUrl: string): boolean {
    // Normalize both URLs for comparison
    const normalizedUrl = this.normalizeUrl(url);
    const normalizedHomepage = this.normalizeUrl(homepageUrl);
    
    // Check if they're exactly the same
    if (normalizedUrl === normalizedHomepage) {
      return true;
    }
    
    // Check if the URL is the root path of the same domain
    try {
      const urlObj = new URL(normalizedUrl);
      const homepageObj = new URL(normalizedHomepage);
      
      return urlObj.hostname === homepageObj.hostname && 
             (urlObj.pathname === '/' || urlObj.pathname === '');
    } catch {
      return false;
    }
  }

  getCrawlStates(): Map<string, CrawlProgress> {
    return this.crawlStates;
  }

  getCrawlQueue(): Map<string, Set<string>> {
    return this.crawlQueue;
  }
}