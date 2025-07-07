import { Injectable, Logger } from '@nestjs/common';
import { CrawledPageRepository } from '../../crawler/repositories/crawled-page.repository';
import { StructuredContentService, StructuredContent } from './structured-content.service';

export interface ExtractedContent {
  html: string;
  title?: string;
  url: string;
  crawledAt: Date;
  structured?: StructuredContent;
}

@Injectable()
export class PageContentService {
  private readonly logger = new Logger(PageContentService.name);

  constructor(
    private readonly crawledPageRepository: CrawledPageRepository,
    private readonly structuredContentService: StructuredContentService,
  ) {}

  /**
   * Get crawled page HTML content
   */
  async getCrawledPageContent(projectId: string, url: string): Promise<ExtractedContent> {
    try {
      this.logger.log(`Retrieving existing crawled content from database for: ${url}`);
      
      // Get the crawled page from database
      const crawledPage = await this.crawledPageRepository.findByProjectIdAndUrl(projectId, url);
      
      if (!crawledPage || !crawledPage.html) {
        throw new Error('Crawled page not found or has no HTML content');
      }
      
      this.logger.log(`Found existing crawled content for ${url} (crawled on ${crawledPage.crawledAt})`);
      
      // Extract structured content
      const structured = this.structuredContentService.extractStructuredContent(
        crawledPage.html,
        crawledPage.url
      );
      
      return {
        html: crawledPage.html,
        title: structured.title || crawledPage.metadata?.title,
        url: crawledPage.url,
        crawledAt: crawledPage.crawledAt,
        structured,
      };
    } catch (error) {
      this.logger.error(`Error getting crawled page content from ${url}: ${error.message}`);
      throw new Error(`Failed to get crawled page content: ${error.message}`);
    }
  }

  /**
   * Validate URL format
   */
  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}