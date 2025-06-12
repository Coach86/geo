import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class FaviconService {
  private readonly logger = new Logger(FaviconService.name);

  /**
   * Extract favicon URL from a website
   * @param websiteUrl The website URL to extract favicon from
   * @returns The favicon URL or undefined if not found
   */
  async extractFavicon(websiteUrl: string): Promise<string | undefined> {
    try {
      this.logger.log(`Extracting favicon from: ${websiteUrl}`);
      
      // Fetch the webpage
      const response = await axios.get(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BrandInsightBot/1.0; +https://brand-insights.example.com)',
        },
        timeout: 5000, // 5 seconds timeout for favicon fetching
        maxRedirects: 3,
      });

      const html = response.data;
      const $ = cheerio.load(html);
      
      let favicon: string | undefined;
      
      // Try different favicon link types in order of preference
      const faviconSelectors = [
        'link[rel="icon"]',
        'link[rel="shortcut icon"]',
        'link[rel="apple-touch-icon"]',
        'link[rel="apple-touch-icon-precomposed"]',
      ];
      
      for (const selector of faviconSelectors) {
        const faviconElement = $(selector).first();
        if (faviconElement.length > 0) {
          favicon = faviconElement.attr('href');
          break;
        }
      }
      
      // If no favicon found in links, try the default favicon.ico
      if (!favicon) {
        try {
          const urlObj = new URL(websiteUrl);
          const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
          
          // Check if favicon.ico exists
          const faviconResponse = await axios.head(faviconUrl, { 
            timeout: 3000,
            validateStatus: (status) => status === 200
          });
          
          if (faviconResponse.status === 200) {
            favicon = faviconUrl;
          }
        } catch (error) {
          // Favicon.ico doesn't exist or couldn't be reached
          this.logger.debug(`No favicon.ico found at default location for ${websiteUrl}`);
        }
      }
      
      // Make relative favicon URLs absolute
      if (favicon && !favicon.startsWith('http')) {
        try {
          const urlObj = new URL(websiteUrl);
          if (favicon.startsWith('//')) {
            favicon = `${urlObj.protocol}${favicon}`;
          } else if (favicon.startsWith('/')) {
            favicon = `${urlObj.protocol}//${urlObj.host}${favicon}`;
          } else {
            // Relative path
            const basePath = websiteUrl.substring(0, websiteUrl.lastIndexOf('/') + 1);
            favicon = `${basePath}${favicon}`;
          }
        } catch (error) {
          this.logger.warn(`Failed to convert relative favicon URL to absolute: ${favicon}`);
        }
      }

      if (favicon) {
        this.logger.log(`Found favicon for ${websiteUrl}: ${favicon}`);
      } else {
        this.logger.log(`No favicon found for ${websiteUrl}`);
      }
      
      return favicon;
    } catch (error) {
      this.logger.error(`Failed to extract favicon from ${websiteUrl}: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Build website URL from a domain/website string
   * Handles cases where the website might not have a protocol
   */
  buildWebsiteUrl(website: string): string {
    if (!website) return '';
    
    // If it already has a protocol, use it as is
    if (website.startsWith('http://') || website.startsWith('https://')) {
      return website;
    }
    
    // Otherwise, add https:// by default
    return `https://${website}`;
  }
}