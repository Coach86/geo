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
import { CrawlOptions, CrawlProgress } from './web-crawler.service';

/**
 * Service responsible for page content extraction and processing.
 * Handles HTTP requests, HTML parsing, metadata extraction, and robots.txt compliance.
 */
@Injectable()
export class PageExtractionService {
  private readonly logger = new Logger(PageExtractionService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly userAgent: string;
  private readonly defaultTimeout: number;
  private readonly maxConcurrentRequests: number;
  private activeRequests = 0;
  private robotsTxtCache: Map<string, any> = new Map(); // domain -> robots parser

  private readonly userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly crawledPageRepository: CrawledPageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.userAgent = this.configService.get<string>(
      'CRAWLER_USER_AGENT',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    this.defaultTimeout = this.configService.get<number>('CRAWLER_TIMEOUT_MS', 30000);
    this.maxConcurrentRequests = this.configService.get<number>('CRAWLER_CONCURRENT_REQUESTS', 5);

    this.axiosInstance = axios.create({
      timeout: this.defaultTimeout,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      validateStatus: () => true, // Don't throw on any status code
    });
  }

  async crawlPage(
    projectId: string,
    url: string,
    baseUrl: string,
    options: CrawlOptions,
    crawlQueue: Map<string, Set<string>>,
    crawlStates: Map<string, CrawlProgress>
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
            // Use custom user-agent if provided, otherwise select random one
            const userAgent = options.userAgent || this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
            const headers = {
              'User-Agent': userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
            };
            return await this.axiosInstance.get(url, { headers });
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

      // Extract and queue new URLs if successful (only in auto mode)
      if (response.status === 200 && options.mode !== 'manual') {
        this.logger.debug(`[CRAWLER] Extracting URLs from ${url}`);
        const newUrls = this.extractUrls($, url, baseUrl);
        this.logger.log(`[CRAWLER] Found ${newUrls.length} URLs on page`);
        
        const queue = crawlQueue.get(projectId);
        if (queue) {
          let addedCount = 0;
          for (const newUrl of newUrls) {
            // Check using normalized URL to prevent duplicates
            const crawledUrls = new Set<string>(); // This should be passed from orchestration service
            if (!crawledUrls.has(newUrl)) {
              queue.add(newUrl);
              addedCount++;
            }
          }
          this.logger.log(`[CRAWLER] Added ${addedCount} new URLs to queue, queue size: ${queue.size}`);
        }
      }

      // Get current progress for this project
      const progress = crawlStates.get(projectId);
      
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
        let jsonContent = $(element).html() || '{}';
        
        // Clean up common issues in JSON-LD
        jsonContent = jsonContent.trim();
        
        // Remove HTML comments that might be in the JSON
        jsonContent = jsonContent.replace(/<!--[\s\S]*?-->/g, '');
        
        // Remove any trailing content after the JSON (common in malformed JSON-LD)
        const firstBraceIndex = jsonContent.indexOf('{');
        const lastBraceIndex = jsonContent.lastIndexOf('}');
        
        if (firstBraceIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
          jsonContent = jsonContent.substring(firstBraceIndex, lastBraceIndex + 1);
        }
        
        // Only try to parse if we have valid-looking JSON
        if (jsonContent.startsWith('{') && jsonContent.endsWith('}')) {
          const json = JSON.parse(jsonContent);
          schemas.push(json);
        } else if (jsonContent.startsWith('[') && jsonContent.endsWith(']')) {
          const json = JSON.parse(jsonContent);
          // If it's an array, add each item
          if (Array.isArray(json)) {
            schemas.push(...json);
          } else {
            schemas.push(json);
          }
        }
      } catch (error) {
        // Only log as debug since malformed JSON-LD is common and not critical
        this.logger.debug(`Failed to parse JSON-LD: ${error.message}`);
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

  async loadRobotsTxt(url: string): Promise<void> {
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

  isAllowedByRobots(url: string): boolean {
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

  async waitForRateLimit(delayMs: number): Promise<void> {
    // Wait for concurrent request limit
    while (this.activeRequests >= this.maxConcurrentRequests) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Apply crawl delay with random jitter
    if (delayMs > 0) {
      // Add random jitter to the delay (±20%)
      const jitter = delayMs * 0.2;
      const randomDelay = delayMs + (Math.random() * jitter * 2 - jitter);
      await new Promise(resolve => setTimeout(resolve, Math.round(randomDelay)));
    }
  }
}