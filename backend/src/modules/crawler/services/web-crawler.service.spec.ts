import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebCrawlerService } from './web-crawler.service';
import { CrawledPageRepository } from '../repositories/crawled-page.repository';
import { Logger } from '../../../utils/logger';
import * as axios from 'axios';
import * as cheerio from 'cheerio';

jest.mock('axios');
jest.mock('../../../utils/logger');

describe('WebCrawlerService', () => {
  let service: WebCrawlerService;
  let crawledPageRepository: jest.Mocked<CrawledPageRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebCrawlerService,
        {
          provide: CrawledPageRepository,
          useValue: {
            create: jest.fn(),
            findByProjectId: jest.fn(),
            update: jest.fn(),
            deleteByProjectId: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(1000),
          },
        },
      ],
    }).compile();

    service = module.get<WebCrawlerService>(WebCrawlerService);
    crawledPageRepository = module.get(CrawledPageRepository);
    eventEmitter = module.get(EventEmitter2);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crawlWebsite', () => {
    it('should crawl a website successfully', async () => {
      const projectId = 'test-project-id';
      const startUrl = 'https://example.com';
      const mockHtml = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Welcome</h1>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </body>
        </html>
      `;

      (axios.default.get as jest.Mock).mockResolvedValueOnce({
        data: mockHtml,
        headers: { 'content-type': 'text/html' },
      });

      crawledPageRepository.create.mockResolvedValue({
        _id: 'page-1',
        projectId,
        url: startUrl,
        title: 'Test Page',
        content: 'Welcome',
        links: ['https://example.com/about', 'https://example.com/contact'],
        crawledAt: new Date(),
      } as any);

      await service.crawlWebsite(projectId, startUrl, { maxPages: 10 });

      expect(crawledPageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          url: startUrl,
          title: 'Test Page',
          content: expect.stringContaining('Welcome'),
        })
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'crawler.progress',
        expect.objectContaining({
          projectId,
          crawledPages: 1,
        })
      );
    });

    it('should respect robots.txt', async () => {
      const projectId = 'test-project-id';
      const startUrl = 'https://example.com/admin';
      
      // Mock robots.txt
      (axios.default.get as jest.Mock).mockImplementation((url) => {
        if (url === 'https://example.com/robots.txt') {
          return Promise.resolve({
            data: 'User-agent: *\nDisallow: /admin',
            headers: { 'content-type': 'text/plain' },
          });
        }
        return Promise.reject(new Error('Should not crawl disallowed URL'));
      });

      await service.crawlWebsite(projectId, startUrl, { maxPages: 10 });

      // Should not crawl the disallowed URL
      expect(crawledPageRepository.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'crawler.completed',
        expect.objectContaining({
          projectId,
          totalPages: 0,
        })
      );
    });

    it('should handle crawl errors gracefully', async () => {
      const projectId = 'test-project-id';
      const startUrl = 'https://example.com';

      (axios.default.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await service.crawlWebsite(projectId, startUrl, { maxPages: 10 });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'crawler.error',
        expect.objectContaining({
          projectId,
          error: expect.any(String),
        })
      );
    });

    it('should respect maxPages limit', async () => {
      const projectId = 'test-project-id';
      const startUrl = 'https://example.com';
      const maxPages = 2;

      const mockHtml = `
        <html>
          <body>
            <a href="/page1">Page 1</a>
            <a href="/page2">Page 2</a>
            <a href="/page3">Page 3</a>
          </body>
        </html>
      `;

      (axios.default.get as jest.Mock).mockResolvedValue({
        data: mockHtml,
        headers: { 'content-type': 'text/html' },
      });

      crawledPageRepository.create.mockResolvedValue({} as any);

      await service.crawlWebsite(projectId, startUrl, { maxPages });

      expect(crawledPageRepository.create).toHaveBeenCalledTimes(maxPages);
    });
  });

  describe('extractPageData', () => {
    it('should extract page data correctly', () => {
      const html = `
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="Test description">
            <meta name="author" content="John Doe">
          </head>
          <body>
            <h1>Main Heading</h1>
            <p>This is a paragraph with <strong>important</strong> text.</p>
            <a href="/internal">Internal Link</a>
            <a href="https://external.com">External Link</a>
          </body>
        </html>
      `;

      const result = service['extractPageData'](html, 'https://example.com/page');

      expect(result.title).toBe('Test Page');
      expect(result.description).toBe('Test description');
      expect(result.author).toBe('John Doe');
      expect(result.content).toContain('Main Heading');
      expect(result.content).toContain('This is a paragraph with important text.');
      expect(result.links).toContain('https://example.com/internal');
      expect(result.links).toContain('https://external.com');
      expect(result.headings.h1).toEqual(['Main Heading']);
    });

    it('should extract structured data', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": "Test Article",
                "datePublished": "2024-01-01"
              }
            </script>
          </head>
          <body>Content</body>
        </html>
      `;

      const result = service['extractPageData'](html, 'https://example.com');

      expect(result.structuredData).toEqual([{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Test Article',
        datePublished: '2024-01-01',
      }]);
    });
  });

  describe('normalizeUrl', () => {
    it('should normalize relative URLs', () => {
      const baseUrl = 'https://example.com/page';
      
      expect(service['normalizeUrl']('/about', baseUrl)).toBe('https://example.com/about');
      expect(service['normalizeUrl']('./contact', baseUrl)).toBe('https://example.com/contact');
      expect(service['normalizeUrl']('../home', baseUrl)).toBe('https://example.com/home');
    });

    it('should handle absolute URLs', () => {
      const baseUrl = 'https://example.com';
      
      expect(service['normalizeUrl']('https://other.com', baseUrl)).toBe('https://other.com');
      expect(service['normalizeUrl']('http://example.com/page', baseUrl)).toBe('http://example.com/page');
    });

    it('should handle invalid URLs', () => {
      const baseUrl = 'https://example.com';
      
      expect(service['normalizeUrl']('javascript:void(0)', baseUrl)).toBeNull();
      expect(service['normalizeUrl']('mailto:test@example.com', baseUrl)).toBeNull();
      expect(service['normalizeUrl']('#section', baseUrl)).toBeNull();
    });
  });

  describe('isSameDomain', () => {
    it('should correctly identify same domain URLs', () => {
      expect(service['isSameDomain']('https://example.com/page1', 'https://example.com/page2')).toBe(true);
      expect(service['isSameDomain']('https://sub.example.com', 'https://example.com')).toBe(false);
      expect(service['isSameDomain']('https://example.com', 'https://other.com')).toBe(false);
      expect(service['isSameDomain']('http://example.com', 'https://example.com')).toBe(true);
    });
  });
});