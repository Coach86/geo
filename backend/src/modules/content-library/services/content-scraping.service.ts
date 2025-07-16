import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ContentLibraryService } from './content-library.service';
import { CreateContentItemDto } from '../dto/create-content-item.dto';
import { ContentItem } from '../entities/content-item.entity';
import * as cheerio from 'cheerio';
import axios from 'axios';

@Injectable()
export class ContentScrapingService {
  private readonly logger = new Logger(ContentScrapingService.name);

  constructor(
    private readonly contentLibraryService: ContentLibraryService,
  ) {}

  async scrapeAndSaveUrls(projectId: string, urls: string[]): Promise<{
    successful: ContentItem[];
    failed: { url: string; error: string }[];
  }> {
    const successful: ContentItem[] = [];
    const failed: { url: string; error: string }[] = [];

    for (const url of urls) {
      try {
        this.logger.log(`Scraping content from URL: ${url}`);
        const contentItem = await this.scrapeUrl(projectId, url);
        successful.push(contentItem);
      } catch (error) {
        this.logger.error(`Failed to scrape ${url}: ${error.message}`);
        failed.push({
          url,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return { successful, failed };
  }

  async scrapeUrl(projectId: string, url: string): Promise<ContentItem> {
    try {
      // Fetch the page content
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });
      
      if (!response.data) {
        throw new BadRequestException(`Unable to fetch content from ${url}`);
      }

      // Extract content using cheerio
      const $ = cheerio.load(response.data);
      
      // Extract title
      const title = this.extractTitle($) || 'Untitled';
      
      // Extract main content
      const content = this.extractMainContent($);
      
      if (!content || content.length < 100) {
        throw new BadRequestException(`Insufficient content extracted from ${url}`);
      }

      // Extract metadata
      const metadata = this.extractMetadata($, url, content);

      // Create content item
      const createDto: CreateContentItemDto = {
        projectId,
        url,
        title,
        content,
        metadata,
      };

      const contentItem = await this.contentLibraryService.createContentItem(createDto);
      
      // Update status to processed
      return await this.contentLibraryService.updateStatus(contentItem.id, 'processed');
      
    } catch (error) {
      this.logger.error(`Error scraping ${url}: ${error.message}`);
      
      // Try to save failed item
      try {
        const failedItem = await this.contentLibraryService.createContentItem({
          projectId,
          url,
          title: 'Failed to extract',
          content: '',
          metadata: {
            source: new URL(url).hostname,
            wordCount: 0,
            extractedAt: new Date(),
          },
        });
        
        await this.contentLibraryService.updateStatus(failedItem.id, 'failed');
      } catch (saveError) {
        // If already exists or other error, just log it
        this.logger.error(`Could not save failed item: ${saveError.message}`);
      }
      
      throw error;
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    // Try multiple selectors for title
    const selectors = [
      'h1',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'title',
      '.entry-title',
      '.post-title',
      '.article-title',
    ];

    for (const selector of selectors) {
      let title = '';
      
      if (selector.startsWith('meta')) {
        title = $(selector).attr('content') || '';
      } else {
        title = $(selector).first().text().trim();
      }
      
      if (title) {
        return title;
      }
    }

    return '';
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    // Remove script and style elements
    $('script, style, noscript').remove();
    
    // Try to find main content area
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.blog-post',
      '.post',
      '#content',
    ];

    let content = '';
    
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 100) {
          break;
        }
      }
    }

    // If no content found, try to get body text
    if (!content || content.length < 100) {
      // Remove header, footer, nav, aside
      $('header, footer, nav, aside, .header, .footer, .navigation, .sidebar').remove();
      content = $('body').text().trim();
    }

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();
    
    return content;
  }

  private extractMetadata(
    $: cheerio.CheerioAPI,
    url: string,
    content: string,
  ): CreateContentItemDto['metadata'] {
    // Extract author
    const authorSelectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      '.author-name',
      '.by-author',
      '.post-author',
      '[rel="author"]',
    ];

    let author = '';
    for (const selector of authorSelectors) {
      if (selector.startsWith('meta')) {
        author = $(selector).attr('content') || '';
      } else {
        author = $(selector).first().text().trim();
      }
      if (author) break;
    }

    // Extract published date
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="publish_date"]',
      'time[datetime]',
      '.published-date',
      '.post-date',
      '.entry-date',
    ];

    let publishedDate: Date | undefined;
    for (const selector of dateSelectors) {
      let dateStr = '';
      
      if (selector.startsWith('meta')) {
        dateStr = $(selector).attr('content') || '';
      } else if (selector === 'time[datetime]') {
        dateStr = $('time').attr('datetime') || '';
      } else {
        dateStr = $(selector).first().text().trim();
      }
      
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          publishedDate = date;
          break;
        }
      }
    }

    // Calculate word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    // Extract source domain
    const urlObj = new URL(url);
    const source = urlObj.hostname.replace('www.', '');

    return {
      author: author || undefined,
      publishedDate,
      source,
      wordCount,
      extractedAt: new Date(),
    };
  }
}