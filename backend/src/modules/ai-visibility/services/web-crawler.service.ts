import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { URL } from 'url';
import { CrawledPageRepository } from '../repositories/crawled-page.repository';
import { CrawlConfigDto } from '../dto/crawl-config.dto';
import { scrapeWebsite } from '../../../utils/url-scraper';
import { BatchEventsGateway } from '../../batch/gateways/batch-events.gateway';

interface CrawlJob {
  url: string;
  depth: number;
  parentUrl?: string;
}

@Injectable()
export class WebCrawlerService {
  private readonly logger = new Logger(WebCrawlerService.name);
  private crawlQueue: CrawlJob[] = [];
  private visitedUrls = new Set<string>();
  private crawlStats = {
    processed: 0,
    failed: 0,
    skipped: 0,
  };
  private currentlyCrawling: string | null = null;

  constructor(
    private readonly crawledPageRepository: CrawledPageRepository,
    private readonly batchEventsGateway: BatchEventsGateway,
  ) {}

  async crawlWebsite(
    projectId: string,
    rootUrl: string,
    config: CrawlConfigDto
  ): Promise<{ 
    totalPages: number; 
    successfulPages: number; 
    failedPages: number; 
  }> {
    this.logger.log(`Starting crawl for project ${projectId} from ${rootUrl}`);
    this.logger.log(`Crawl config: ${JSON.stringify(config)}`);
    
    // Reset state
    this.crawlQueue = [];
    this.visitedUrls.clear();
    this.crawlStats = { processed: 0, failed: 0, skipped: 0 };

    // Clear existing crawled pages for this project
    this.logger.log(`Clearing existing crawled pages for project ${projectId}`);
    await this.crawledPageRepository.deleteByProject(projectId);

    // Parse root URL
    const rootUrlObj = new URL(rootUrl);
    const allowedDomains = config.allowedDomains || [rootUrlObj.hostname];

    // Add root URL to queue
    this.crawlQueue.push({ url: rootUrl, depth: 0 });
    this.logger.log(`Added root URL to queue: ${rootUrl}`);

    // Process queue
    while (this.crawlQueue.length > 0 && this.crawlStats.processed < config.maxPages) {
      const job = this.crawlQueue.shift()!;
      this.logger.log(`Processing URL: ${job.url} (depth: ${job.depth}, queue size: ${this.crawlQueue.length})`);
      
      if (this.visitedUrls.has(job.url)) {
        this.logger.debug(`Skipping already visited URL: ${job.url}`);
        this.crawlStats.skipped++;
        continue;
      }
      
      if (job.depth > config.maxDepth) {
        this.logger.debug(`Skipping URL due to depth limit: ${job.url} (depth: ${job.depth} > ${config.maxDepth})`);
        this.crawlStats.skipped++;
        continue;
      }

      await this.crawlPage(projectId, job, config, allowedDomains);
      
      // Add delay between requests
      if (config.crawlDelay) {
        this.logger.debug(`Waiting ${config.crawlDelay}ms before next request`);
        await new Promise(resolve => setTimeout(resolve, config.crawlDelay));
      }
      
      this.logger.log(`Progress: Processed: ${this.crawlStats.processed}, Failed: ${this.crawlStats.failed}, Skipped: ${this.crawlStats.skipped}`);
      
      // Emit real-time progress
      this.batchEventsGateway.emitCrawlProgress(projectId, {
        processed: this.crawlStats.processed,
        failed: this.crawlStats.failed,
        total: this.crawlStats.processed + this.crawlStats.failed + this.crawlQueue.length,
        currentUrl: this.currentlyCrawling || undefined,
        queueSize: this.crawlQueue.length,
      });
    }

    const result = {
      totalPages: this.crawlStats.processed + this.crawlStats.failed,
      successfulPages: this.crawlStats.processed,
      failedPages: this.crawlStats.failed,
    };
    
    this.logger.log(`Crawl completed: ${JSON.stringify(result)}`);
    
    // Emit crawl completed event
    this.batchEventsGateway.emitCrawlCompleted(projectId, result);
    
    return result;
  }

  private async crawlPage(
    projectId: string,
    job: CrawlJob,
    config: CrawlConfigDto,
    allowedDomains: string[]
  ): Promise<void> {
    this.visitedUrls.add(job.url);
    this.currentlyCrawling = job.url;
    this.logger.log(`Starting to crawl: ${job.url}`);

    try {
      // Check if URL should be excluded
      if (this.shouldExcludeUrl(job.url, config.excludePatterns)) {
        this.logger.log(`Excluding URL based on patterns: ${job.url}`);
        this.crawlStats.skipped++;
        return;
      }

      // Scrape the page with timeout
      this.logger.log(`Scraping content from: ${job.url}`);
      const scrapeTimeout = 45000; // 45 seconds timeout per page
      const scrapedData = await Promise.race([
        scrapeWebsite(job.url),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Scrape timeout after ${scrapeTimeout}ms`)), scrapeTimeout)
        )
      ]);
      
      if (!scrapedData) {
        throw new Error('Failed to scrape page - no data returned');
      }
      
      this.logger.log(`Scraped ${scrapedData.content?.length || 0} characters of content from ${job.url}`);
      this.logger.debug(`Title: ${scrapedData.title}`);

      // Parse HTML to extract links and additional metadata
      const $ = cheerio.load(scrapedData.html || '');
      const links = this.extractLinks($, job.url, allowedDomains);
      const headings = this.extractHeadings($);
      
      this.logger.log(`Found ${links.internal.length} internal links and ${links.external.length} external links`);
      
      // Calculate content hash
      const contentHash = crypto
        .createHash('md5')
        .update(scrapedData.content || '')
        .digest('hex');

      // Create crawled page document
      await this.crawledPageRepository.create({
        projectId,
        url: job.url,
        content: scrapedData.content || '',
        title: scrapedData.title,
        h1: $('h1').first().text().trim(),
        metaDescription: scrapedData.metaDescription,
        canonicalUrl: this.extractCanonicalUrl($) || job.url,
        headings,
        metadata: {
          keywords: scrapedData.metaKeywords?.split(',').map((k: string) => k.trim()),
          language: $('html').attr('lang') || 'en',
        },
        crawlDepth: job.depth,
        parentUrl: job.parentUrl,
        outboundLinks: links.external,
        internalLinks: links.internal,
        status: 'success',
        crawledAt: new Date(),
        contentHash,
        wordCount: this.countWords(scrapedData.content || ''),
      });

      this.crawlStats.processed++;
      this.logger.log(`Successfully crawled and saved: ${job.url}`);

      // Add internal links to queue if within depth limit
      if (job.depth < config.maxDepth) {
        let addedLinks = 0;
        for (const link of links.internal) {
          if (!this.visitedUrls.has(link) && this.crawlQueue.length + this.crawlStats.processed < config.maxPages) {
            this.crawlQueue.push({
              url: link,
              depth: job.depth + 1,
              parentUrl: job.url,
            });
            addedLinks++;
          }
        }
        this.logger.log(`Added ${addedLinks} new URLs to crawl queue`);
      } else {
        this.logger.debug(`Reached max depth (${config.maxDepth}), not adding more links`);
      }

    } catch (error) {
      this.logger.error(`Failed to crawl ${job.url}: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      
      await this.crawledPageRepository.create({
        projectId,
        url: job.url,
        content: '',
        status: 'error',
        errorMessage: error.message,
        crawlDepth: job.depth,
        parentUrl: job.parentUrl,
        crawledAt: new Date(),
      });

      this.crawlStats.failed++;
    } finally {
      this.currentlyCrawling = null;
    }
  }

  private extractLinks(
    $: cheerio.CheerioAPI, 
    currentUrl: string, 
    allowedDomains: string[]
  ): { internal: string[]; external: string[] } {
    const internal: string[] = [];
    const external: string[] = [];
    const currentUrlObj = new URL(currentUrl);

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        const linkUrl = new URL(href, currentUrl);
        const normalizedUrl = linkUrl.href.replace(/\/$/, ''); // Remove trailing slash

        if (allowedDomains.includes(linkUrl.hostname)) {
          internal.push(normalizedUrl);
        } else if (linkUrl.protocol.startsWith('http')) {
          external.push(normalizedUrl);
        }
      } catch (error) {
        // Invalid URL, skip
      }
    });

    return { 
      internal: [...new Set(internal)], 
      external: [...new Set(external)] 
    };
  }

  private extractHeadings($: cheerio.CheerioAPI): string[] {
    const headings: string[] = [];
    
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const text = $(element).text().trim();
      if (text) {
        headings.push(text);
      }
    });

    return headings;
  }

  private extractCanonicalUrl($: cheerio.CheerioAPI): string | null {
    const canonical = $('link[rel="canonical"]').attr('href');
    return canonical || null;
  }

  private shouldExcludeUrl(url: string, excludePatterns?: string[]): boolean {
    if (!excludePatterns || excludePatterns.length === 0) {
      return false;
    }

    return excludePatterns.some(pattern => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(url);
      } catch {
        return url.includes(pattern);
      }
    });
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  async getCrawlStatus(projectId: string): Promise<{
    totalPages: number;
    successfulPages: number;
    failedPages: number;
    urls: string[];
    isActive: boolean;
    currentUrl: string | null;
    queueSize: number;
  }> {
    const pages = await this.crawledPageRepository.findByProjectId(projectId);
    const successfulPages = pages.filter(p => p.status === 'success').length;
    const failedPages = pages.filter(p => p.status === 'error').length;
    const urls = pages.filter(p => p.status === 'success').map(p => p.url);

    return {
      totalPages: pages.length,
      successfulPages,
      failedPages,
      urls,
      isActive: this.currentlyCrawling !== null,
      currentUrl: this.currentlyCrawling,
      queueSize: this.crawlQueue.length,
    };
  }
}