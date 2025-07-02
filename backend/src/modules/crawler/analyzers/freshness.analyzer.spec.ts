import { Test, TestingModule } from '@nestjs/testing';
import { FreshnessAnalyzer } from './freshness.analyzer';
import { ScoringRulesService } from '../services/scoring-rules.service';
import { CrawledPage } from '../schemas/crawled-page.schema';

describe('FreshnessAnalyzer', () => {
  let analyzer: FreshnessAnalyzer;
  let scoringRulesService: jest.Mocked<ScoringRulesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FreshnessAnalyzer,
        {
          provide: ScoringRulesService,
          useValue: {
            getRules: jest.fn().mockReturnValue({
              dimensions: {
                freshness: {
                  thresholds: [
                    { min: 0, max: 20, score: 20, description: 'Very outdated (>2 years)' },
                    { min: 21, max: 40, score: 40, description: 'Outdated (1-2 years)' },
                    { min: 41, max: 60, score: 60, description: 'Moderately fresh (6 months - 1 year)' },
                    { min: 61, max: 80, score: 80, description: 'Fresh (1-6 months)' },
                    { min: 81, max: 100, score: 100, description: 'Very fresh (<1 month)' },
                  ],
                  criteria: {
                    maxDaysForVeryFresh: 30,
                    maxDaysForFresh: 180,
                    maxDaysForModerate: 365,
                    maxDaysForOutdated: 730,
                  },
                },
              },
            }),
          },
        },
      ],
    }).compile();

    analyzer = module.get<FreshnessAnalyzer>(FreshnessAnalyzer);
    scoringRulesService = module.get(ScoringRulesService);
  });

  describe('analyze', () => {
    it('should give high score for very fresh content', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 15); // 15 days ago

      const page: Partial<CrawledPage> = {
        publishedDate: recentDate,
        modifiedDate: recentDate,
        content: 'Fresh content',
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      expect(result.score).toBe(100);
      expect(result.metrics.daysSinceUpdate).toBe(15);
      expect(result.metrics.daysSincePublished).toBe(15);
      expect(result.metrics.hasPublishedDate).toBe(true);
      expect(result.metrics.hasModifiedDate).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should give low score for very old content', async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 3); // 3 years ago

      const page: Partial<CrawledPage> = {
        publishedDate: oldDate,
        content: 'Old content',
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      expect(result.score).toBe(20);
      expect(result.metrics.daysSincePublished).toBeGreaterThan(365 * 2);
      expect(result.issues).toContain('Content is very outdated (over 2 years old)');
      expect(result.issues).toContain('No last modified date found');
    });

    it('should use crawl date when no publish date is available', async () => {
      const crawledAt = new Date();
      crawledAt.setMonth(crawledAt.getMonth() - 3); // 3 months ago

      const page: Partial<CrawledPage> = {
        crawledAt,
        content: 'Content without dates',
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      expect(result.score).toBe(80); // Fresh (1-6 months)
      expect(result.metrics.daysSinceUpdate).toBeCloseTo(90, -1);
      expect(result.metrics.hasPublishedDate).toBe(false);
      expect(result.issues).toContain('No published date found');
    });

    it('should prefer modified date over published date for freshness', async () => {
      const publishedDate = new Date();
      publishedDate.setFullYear(publishedDate.getFullYear() - 2); // 2 years ago
      
      const modifiedDate = new Date();
      modifiedDate.setMonth(modifiedDate.getMonth() - 2); // 2 months ago

      const page: Partial<CrawledPage> = {
        publishedDate,
        modifiedDate,
        content: 'Updated content',
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      expect(result.score).toBe(80); // Based on modified date, not published
      expect(result.metrics.daysSinceUpdate).toBeCloseTo(60, -1);
      expect(result.metrics.daysSincePublished).toBeGreaterThan(365 * 2);
    });

    it('should extract date from structured data', async () => {
      const page: Partial<CrawledPage> = {
        content: 'Content with structured data',
        structuredData: [{
          '@type': 'Article',
          datePublished: '2024-01-15',
          dateModified: '2024-02-01',
        }],
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      expect(result.metrics.hasPublishedDate).toBe(true);
      expect(result.metrics.hasModifiedDate).toBe(true);
      // Score will depend on current date vs the dates in structured data
    });

    it('should handle multiple structured data entries', async () => {
      const recentDate = new Date().toISOString();
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 5);

      const page: Partial<CrawledPage> = {
        content: 'Content with multiple structured data',
        structuredData: [
          {
            '@type': 'Article',
            datePublished: oldDate.toISOString(),
          },
          {
            '@type': 'NewsArticle',
            datePublished: recentDate,
          },
        ],
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      // Should use the most recent date found
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('should handle missing or invalid dates gracefully', async () => {
      const page: Partial<CrawledPage> = {
        publishedDate: null as any,
        modifiedDate: 'invalid-date' as any,
        content: 'Content',
        structuredData: [{
          '@type': 'Article',
          datePublished: 'not-a-date',
        }],
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      expect(result.score).toBe(60); // Default for no date info
      expect(result.metrics.hasPublishedDate).toBe(false);
      expect(result.metrics.hasModifiedDate).toBe(false);
      expect(result.issues).toContain('No published date found');
      expect(result.issues).toContain('No last modified date found');
    });

    it('should categorize content age correctly', async () => {
      const testCases = [
        { daysAgo: 15, expectedScore: 100, description: 'Very fresh' },
        { daysAgo: 90, expectedScore: 80, description: 'Fresh' },
        { daysAgo: 270, expectedScore: 60, description: 'Moderately fresh' },
        { daysAgo: 500, expectedScore: 40, description: 'Outdated' },
        { daysAgo: 1000, expectedScore: 20, description: 'Very outdated' },
      ];

      for (const testCase of testCases) {
        const date = new Date();
        date.setDate(date.getDate() - testCase.daysAgo);

        const page: Partial<CrawledPage> = {
          publishedDate: date,
          content: 'Test content',
        };

        const result = await analyzer.analyze(page as CrawledPage, {});
        
        expect(result.score).toBe(testCase.expectedScore);
        expect(result.description).toContain(testCase.description);
      }
    });
  });
});