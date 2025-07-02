import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
const robotsParser = require('robots-parser');
import * as crypto from 'crypto';
import { URL } from 'url';
import { CrawledPageRepository } from '../repositories/crawled-page.repository';
import { PageMetadata } from '../schemas/crawled-page.schema';
import { RetryUtil } from '../../../utils/retry.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { parseStringPromise } from 'xml2js';

export interface CrawlOptions {
  maxPages: number;
  crawlDelay: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  respectRobotsTxt: boolean;
  userAgent?: string;
  timeout?: number;
  maxDepth?: number;
}

export interface CrawlProgress {
  crawled: number;
  total: number;
  currentUrl: string;
  errors: number;
  status: 'running' | 'completed' | 'failed';
}

@Injectable()
export class WebCrawlerService {
  private readonly logger = new Logger(WebCrawlerService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly userAgent: string;
  private readonly defaultTimeout: number;
  private readonly maxConcurrentRequests: number;
  private activeRequests = 0;
  private crawlQueue: Map<string, Set<string>> = new Map(); // projectId -> URLs to crawl
  private crawledUrls: Map<string, Set<string>> = new Map(); // projectId -> crawled URLs
  private robotsTxtCache: Map<string, any> = new Map(); // domain -> robots parser
  private crawlStates: Map<string, CrawlProgress> = new Map(); // projectId -> current crawl state

  constructor(
    private readonly configService: ConfigService,
    private readonly crawledPageRepository: CrawledPageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.userAgent = this.configService.get<string>(
      'CRAWLER_USER_AGENT',
      'MintAI-Crawler/1.0 (+https://mintai.com/bot)'
    );
    this.defaultTimeout = this.configService.get<number>('CRAWLER_TIMEOUT_MS', 30000);
    this.maxConcurrentRequests = this.configService.get<number>('CRAWLER_CONCURRENT_REQUESTS', 5);

    this.axiosInstance = axios.create({
      timeout: this.defaultTimeout,
      headers: {
        'User-Agent': this.userAgent,
      },
      validateStatus: () => true, // Don't throw on any status code
    });
  }

  async crawlWebsite(projectId: string, startUrl: string, options: CrawlOptions): Promise<void> {
    this.logger.log(`[CRAWLER] Starting crawl for project ${projectId}`);
    this.logger.log(`[CRAWLER] URL: ${startUrl}`);
    this.logger.log(`[CRAWLER] Max pages: ${options.maxPages}`);
    this.logger.log(`[CRAWLER] Crawl delay: ${options.crawlDelay}ms`);
    
    // Normalize the start URL
    const normalizedStartUrl = this.normalizeUrl(startUrl);
    this.logger.log(`[CRAWLER] Normalized start URL: ${normalizedStartUrl}`);
    
    // Initialize crawl state
    this.crawlQueue.set(projectId, new Set([normalizedStartUrl]));
    this.crawledUrls.set(projectId, new Set());

    // Try to discover URLs from sitemap first
    await this.discoverUrlsFromSitemap(projectId, startUrl, options);

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
        await this.loadRobotsTxt(normalizedStartUrl);
      }

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
        if (options.respectRobotsTxt && !this.isAllowedByRobots(normalizedUrl)) {
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
        await this.waitForRateLimit(options.crawlDelay);

        // Crawl the page
        try {
          await this.crawlPage(projectId, normalizedUrl, normalizedStartUrl, options);
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

  private async crawlPage(
    projectId: string,
    url: string,
    baseUrl: string,
    options: CrawlOptions,
  ): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`[CRAWLER] Starting to crawl page: ${url}`);

    try {
      // Fetch the page with retry logic
      this.logger.log(`[CRAWLER] Fetching page content from: ${url}`);
      const response = await RetryUtil.withRetry(
        async () => {
          this.activeRequests++;
          try {
            this.logger.debug(`[CRAWLER] Active requests: ${this.activeRequests}/${this.maxConcurrentRequests}`);
            return await this.axiosInstance.get(url);
          } finally {
            this.activeRequests--;
          }
        },
        {
          maxRetries: 3,
          baseDelayMs: 1000,
        },
        `Crawling ${url}`
      );

      const responseTimeMs = Date.now() - startTime;
      this.logger.log(`[CRAWLER] Page fetched successfully - Status: ${response.status}, Time: ${responseTimeMs}ms`);

      // Parse HTML
      this.logger.debug(`[CRAWLER] Parsing HTML content for ${url}`);
      const $ = cheerio.load(response.data);
      
      // Extract metadata
      this.logger.debug(`[CRAWLER] Extracting metadata from ${url}`);
      const metadata = this.extractMetadata($);
      this.logger.log(`[CRAWLER] Metadata extracted - Title: "${metadata.title}", Description: ${metadata.description ? 'present' : 'missing'}`);
      
      // Calculate content hash
      const contentHash = this.calculateContentHash(response.data);
      this.logger.debug(`[CRAWLER] Content hash calculated: ${contentHash.substring(0, 8)}...`);

      // Save to database using upsert to avoid duplicate key errors
      this.logger.log(`[CRAWLER] Saving page to database - URL: ${url}`);
      await this.crawledPageRepository.upsert(projectId, url, {
        html: response.data,
        crawledAt: new Date(),
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
        metadata,
        contentHash,
        responseTimeMs,
        isProcessed: false,
      });
      this.logger.log(`[CRAWLER] Page saved successfully to database`);

      // Extract and queue new URLs if successful
      if (response.status === 200) {
        this.logger.debug(`[CRAWLER] Extracting URLs from ${url}`);
        const newUrls = this.extractUrls($, url, baseUrl);
        this.logger.log(`[CRAWLER] Found ${newUrls.length} URLs on page`);
        
        const queue = this.crawlQueue.get(projectId);
        if (queue) {
          let addedCount = 0;
          for (const newUrl of newUrls) {
            // Check using normalized URL to prevent duplicates
            if (!this.crawledUrls.get(projectId)?.has(newUrl)) {
              queue.add(newUrl);
              addedCount++;
            }
          }
          this.logger.log(`[CRAWLER] Added ${addedCount} new URLs to queue, queue size: ${queue.size}`);
        }
      }

      // Get current progress for this project
      const progress = this.crawlStates.get(projectId);
      
      this.logger.log(`[CRAWLER] Emitting page_crawled event for ${url} - Progress: ${progress?.crawled || 0}/${progress?.total || 0}`);
      this.eventEmitter.emit('crawler.page_crawled', {
        projectId,
        url,
        statusCode: response.status,
        responseTimeMs,
        crawled: progress?.crawled || 0,
        total: progress?.total || options.maxPages || 100,
      });
    } catch (error) {
      this.logger.error(`[CRAWLER] Error crawling ${url}: ${error.message}`);
      
      // Save error state using upsert - use placeholder HTML to satisfy validation
      this.logger.log(`[CRAWLER] Saving error state to database for ${url}`);
      await this.crawledPageRepository.upsert(projectId, url, {
        html: '<html><body>Error: Could not fetch content</body></html>', // Placeholder HTML
        crawledAt: new Date(),
        statusCode: 0,
        headers: {},
        metadata: {
          title: '',
          description: '',
          schema: [],
        },
        contentHash: '',
        responseTimeMs: Date.now() - startTime,
        errorMessage: error.message,
        isProcessed: false,
      });
      
      throw error;
    }
  }

  private extractMetadata($: cheerio.CheerioAPI): PageMetadata {
    // Extract title
    const title = $('title').text().trim() || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') || '';

    // Extract description
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       $('meta[name="twitter:description"]').attr('content') || '';

    // Extract author
    const author = $('meta[name="author"]').attr('content') || 
                   $('meta[property="article:author"]').attr('content') || 
                   $('[rel="author"]').text().trim() || 
                   $('.author-name').text().trim() || 
                   $('.by-author').text().trim() || 
                   undefined;

    // Extract dates
    const publishDate = this.extractDate($, 'publish');
    const modifiedDate = this.extractDate($, 'modified');

    // Extract canonical URL
    const canonicalUrl = $('link[rel="canonical"]').attr('href') || undefined;

    // Extract language
    const lang = $('html').attr('lang') || 
                 $('meta[property="og:locale"]').attr('content') || 
                 undefined;

    // Extract structured data
    const schema = this.extractStructuredData($);

    return {
      title,
      description,
      author,
      publishDate,
      modifiedDate,
      schema,
      canonicalUrl,
      lang,
    };
  }

  private extractDate($: cheerio.CheerioAPI, type: 'publish' | 'modified'): Date | undefined {
    const selectors = type === 'publish' 
      ? [
          'meta[property="article:published_time"]',
          'meta[name="publish_date"]',
          'time[datetime]',
          '.publish-date',
          '.posted-on',
        ]
      : [
          'meta[property="article:modified_time"]',
          'meta[name="last-modified"]',
          'time[datetime].updated',
          '.last-updated',
          '.modified-date',
        ];

    for (const selector of selectors) {
      const element = $(selector).first();
      const dateStr = element.attr('content') || 
                     element.attr('datetime') || 
                     element.text().trim();
      
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return undefined;
  }

  private extractStructuredData($: cheerio.CheerioAPI): Record<string, unknown>[] {
    const schemas: Record<string, unknown>[] = [];

    // Extract JSON-LD
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const json = JSON.parse($(element).html() || '{}');
        schemas.push(json);
      } catch (error) {
        this.logger.debug('Failed to parse JSON-LD', error);
      }
    });

    return schemas;
  }

  private extractUrls($: cheerio.CheerioAPI, currentUrl: string, baseUrl: string): string[] {
    const urls = new Set<string>();
    const currentUrlObj = new URL(currentUrl);
    const baseUrlObj = new URL(baseUrl);

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        // Resolve relative URLs
        const absoluteUrl = new URL(href, currentUrl);
        
        // Only crawl same domain
        if (absoluteUrl.hostname === baseUrlObj.hostname) {
          // Normalize URL using our consistent normalization function
          const normalizedUrl = this.normalizeUrl(absoluteUrl.toString());
          urls.add(normalizedUrl);
        }
      } catch (error) {
        // Invalid URL, skip
      }
    });

    return Array.from(urls);
  }

  private async loadRobotsTxt(url: string): Promise<void> {
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;

      if (this.robotsTxtCache.has(urlObj.hostname)) {
        return;
      }

      const response = await this.axiosInstance.get(robotsUrl, { timeout: 5000 });
      if (response.status === 200) {
        const robots = robotsParser(robotsUrl, response.data);
        this.robotsTxtCache.set(urlObj.hostname, robots);
      }
    } catch (error) {
      this.logger.debug(`Failed to load robots.txt: ${error.message}`);
    }
  }

  private isAllowedByRobots(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const robots = this.robotsTxtCache.get(urlObj.hostname);
      
      if (!robots) {
        return true; // Allow if no robots.txt
      }

      return robots.isAllowed(url, this.userAgent);
    } catch (error) {
      return true; // Allow on error
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

  private calculateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
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

  private async waitForRateLimit(delayMs: number): Promise<void> {
    // Wait for concurrent request limit
    while (this.activeRequests >= this.maxConcurrentRequests) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Apply crawl delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  async getCrawlStatus(projectId: string): Promise<any> {
    const stats = await this.crawledPageRepository.getProjectCrawlStats(projectId);
    const queue = this.crawlQueue.get(projectId);
    const crawlState = this.crawlStates.get(projectId);
    
    return {
      ...stats,
      isActive: crawlState !== undefined && crawlState.status === 'running',
      isRunning: queue !== undefined,
      queueSize: queue?.size || 0,
      crawledPages: crawlState?.crawled || stats.successfulPages || 0,
      totalPages: crawlState?.total || stats.totalPages || 0,
    };
  }

  /**
   * Discover URLs from sitemap.xml files
   * This is much more efficient than crawling links
   */
  private async discoverUrlsFromSitemap(projectId: string, startUrl: string, options: CrawlOptions): Promise<void> {
    this.logger.log(`[SITEMAP] Starting sitemap discovery for ${startUrl}`);
    
    try {
      const baseUrl = new URL(startUrl);
      const domain = baseUrl.hostname;
      
      // Try common sitemap locations
      const sitemapUrls = [
        `${baseUrl.protocol}//${domain}/sitemap.xml`,
        `${baseUrl.protocol}//${domain}/sitemap_index.xml`,
        `${baseUrl.protocol}//${domain}/sitemaps.xml`,
        `${baseUrl.protocol}//${domain}/sitemap/sitemap.xml`,
      ];

      // Also check robots.txt for sitemap declaration
      const robotsSitemaps = await this.getSitemapsFromRobotsTxt(baseUrl);
      sitemapUrls.push(...robotsSitemaps);

      // Remove duplicates
      const uniqueSitemaps = [...new Set(sitemapUrls)];
      this.logger.log(`[SITEMAP] Checking ${uniqueSitemaps.length} potential sitemap URLs`);

      for (const sitemapUrl of uniqueSitemaps) {
        try {
          const urls = await this.parseSitemap(sitemapUrl, domain, options);
          if (urls.length > 0) {
            this.logger.log(`[SITEMAP] Found ${urls.length} URLs in ${sitemapUrl}`);
            
            // Add URLs to the crawl queue
            const queue = this.crawlQueue.get(projectId);
            if (queue) {
              let addedCount = 0;
              for (const url of urls) {
                const normalizedUrl = this.normalizeUrl(url);
                if (!this.crawledUrls.get(projectId)?.has(normalizedUrl)) {
                  queue.add(normalizedUrl);
                  addedCount++;
                  
                  // Stop if we've hit the max pages limit
                  if (queue.size >= options.maxPages) {
                    this.logger.log(`[SITEMAP] Reached maxPages limit (${options.maxPages}), stopping sitemap discovery`);
                    break;
                  }
                }
              }
              this.logger.log(`[SITEMAP] Added ${addedCount} URLs from sitemap, total queue size: ${queue.size}`);
              
              // If we found a working sitemap, we can stop checking others
              if (addedCount > 0) {
                break;
              }
            }
          }
        } catch (error) {
          this.logger.debug(`[SITEMAP] Failed to parse ${sitemapUrl}: ${error.message}`);
        }
      }

      const finalQueueSize = this.crawlQueue.get(projectId)?.size || 0;
      this.logger.log(`[SITEMAP] Sitemap discovery completed. Total URLs to crawl: ${finalQueueSize}`);
      
    } catch (error) {
      this.logger.error(`[SITEMAP] Error during sitemap discovery: ${error.message}`);
      // Don't throw - sitemap discovery failure shouldn't stop the crawl
    }
  }

  /**
   * Get sitemap URLs from robots.txt
   */
  private async getSitemapsFromRobotsTxt(baseUrl: URL): Promise<string[]> {
    try {
      const robotsUrl = `${baseUrl.protocol}//${baseUrl.hostname}/robots.txt`;
      const response = await this.axiosInstance.get(robotsUrl, { timeout: 5000 });
      
      if (response.status === 200) {
        const robotsContent = response.data;
        const sitemapMatches = robotsContent.match(/^sitemap:\s*(.+)$/gim);
        
        if (sitemapMatches) {
          const sitemaps = sitemapMatches.map((match: string) => {
            const url = match.replace(/^sitemap:\s*/i, '').trim();
            // Make sure URL is absolute
            try {
              return new URL(url).toString();
            } catch {
              return new URL(url, baseUrl).toString();
            }
          });
          
          this.logger.log(`[SITEMAP] Found ${sitemaps.length} sitemaps in robots.txt: ${sitemaps.join(', ')}`);
          return sitemaps;
        }
      }
    } catch (error) {
      this.logger.debug(`[SITEMAP] Failed to check robots.txt for sitemaps: ${error.message}`);
    }
    
    return [];
  }

  /**
   * Parse a sitemap XML file and extract URLs
   */
  private async parseSitemap(sitemapUrl: string, domain: string, options: CrawlOptions): Promise<string[]> {
    try {
      this.logger.debug(`[SITEMAP] Fetching sitemap: ${sitemapUrl}`);
      const response = await this.axiosInstance.get(sitemapUrl, { 
        timeout: 10000,
        headers: {
          'Accept': 'application/xml, text/xml, */*',
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xmlContent = response.data;
      const parsed = await parseStringPromise(xmlContent);

      // Handle sitemap index files
      if (parsed.sitemapindex) {
        this.logger.log(`[SITEMAP] Found sitemap index with ${parsed.sitemapindex.sitemap?.length || 0} sitemaps`);
        const urls: string[] = [];
        
        for (const sitemap of parsed.sitemapindex.sitemap || []) {
          const childSitemapUrl = sitemap.loc?.[0];
          if (childSitemapUrl) {
            try {
              const childUrls = await this.parseSitemap(childSitemapUrl, domain, options);
              urls.push(...childUrls);
              
              // Stop if we have enough URLs
              if (urls.length >= options.maxPages) {
                break;
              }
            } catch (error) {
              this.logger.debug(`[SITEMAP] Failed to parse child sitemap ${childSitemapUrl}: ${error.message}`);
            }
          }
        }
        
        return urls.slice(0, options.maxPages);
      }

      // Handle regular sitemap files
      if (parsed.urlset) {
        const urls: string[] = [];
        
        for (const urlEntry of parsed.urlset.url || []) {
          const url = urlEntry.loc?.[0];
          if (url && this.isValidUrl(url, domain, options)) {
            urls.push(url);
          }
        }
        
        this.logger.log(`[SITEMAP] Extracted ${urls.length} valid URLs from sitemap`);
        return urls.slice(0, options.maxPages);
      }

      this.logger.debug(`[SITEMAP] No valid sitemap structure found in ${sitemapUrl}`);
      return [];

    } catch (error) {
      throw new Error(`Failed to parse sitemap ${sitemapUrl}: ${error.message}`);
    }
  }

  /**
   * Check if a URL from sitemap is valid for crawling
   */
  private isValidUrl(url: string, domain: string, options: CrawlOptions): boolean {
    try {
      const urlObj = new URL(url);
      
      // Must be same domain
      if (urlObj.hostname !== domain) {
        return false;
      }

      // Check include/exclude patterns
      if (!this.matchesPatterns(url, options.includePatterns, options.excludePatterns)) {
        return false;
      }

      // Skip common non-content URLs
      const path = urlObj.pathname.toLowerCase();
      const skipPatterns = [
        '/wp-admin', '/admin', '/login', '/logout',
        '/api/', '/ajax/', '/.well-known/',
        '/feed', '/feeds/', '/rss', '/atom',
        '/search', '/tag/', '/category/',
        '/wp-content/', '/wp-includes/',
        '.xml', '.json', '.pdf', '.zip', '.rar',
        '.jpg', '.jpeg', '.png', '.gif', '.svg',
        '.css', '.js', '.ico', '.woff', '.ttf'
      ];

      for (const pattern of skipPatterns) {
        if (path.includes(pattern)) {
          return false;
        }
      }

      return true;
      
    } catch (error) {
      return false;
    }
  }
}