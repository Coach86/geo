import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { parseStringPromise } from 'xml2js';
import { URL } from 'url';
import { CrawlOptions } from './web-crawler.service';

/**
 * Service responsible for sitemap discovery and URL extraction.
 * Handles sitemap.xml parsing, robots.txt sitemap declarations, and URL validation.
 */
@Injectable()
export class SitemapDiscoveryService {
  private readonly logger = new Logger(SitemapDiscoveryService.name);
  private readonly axiosInstance: AxiosInstance;

  private readonly userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': this.userAgents[0],
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

  /**
   * Discover URLs from sitemap.xml files
   * This is much more efficient than crawling links
   */
  async discoverUrlsFromSitemap(
    projectId: string, 
    startUrl: string, 
    options: CrawlOptions,
    crawlQueue: Map<string, Set<string>>,
    crawledUrls: Map<string, Set<string>>
  ): Promise<void> {
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
            const queue = crawlQueue.get(projectId);
            if (queue) {
              let addedCount = 0;
              for (const url of urls) {
                const normalizedUrl = this.normalizeUrl(url);
                if (!crawledUrls.get(projectId)?.has(normalizedUrl)) {
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

      const finalQueueSize = crawlQueue.get(projectId)?.size || 0;
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
      const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
      const response = await this.axiosInstance.get(robotsUrl, { 
        timeout: 5000,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
        }
      });
      
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
      const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
      const response = await this.axiosInstance.get(sitemapUrl, { 
        timeout: 10000,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
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
}