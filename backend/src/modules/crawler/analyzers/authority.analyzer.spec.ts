import { Test, TestingModule } from '@nestjs/testing';
import { AuthorityAnalyzer } from './authority.analyzer';
import { ScoringRulesService } from '../services/scoring-rules.service';
import { CrawledPage } from '../schemas/crawled-page.schema';

describe('AuthorityAnalyzer', () => {
  let analyzer: AuthorityAnalyzer;
  let scoringRulesService: jest.Mocked<ScoringRulesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorityAnalyzer,
        {
          provide: ScoringRulesService,
          useValue: {
            getRules: jest.fn().mockReturnValue({
              dimensions: {
                authority: {
                  thresholds: [
                    { min: 0, max: 20, score: 20, description: 'No authority signals' },
                    { min: 21, max: 40, score: 40, description: 'Little trust' },
                    { min: 41, max: 60, score: 60, description: 'Good but vague' },
                    { min: 61, max: 80, score: 80, description: 'Clear authority' },
                    { min: 81, max: 100, score: 100, description: 'High authority' },
                  ],
                  criteria: {
                    authorRequired: true,
                    minOutboundCitations: 2,
                    trustedDomains: ['wikipedia.org', 'gov', 'edu', 'nih.gov', 'nature.com'],
                  },
                },
              },
            }),
          },
        },
      ],
    }).compile();

    analyzer = module.get<AuthorityAnalyzer>(AuthorityAnalyzer);
    scoringRulesService = module.get(ScoringRulesService);
  });

  describe('analyze', () => {
    it('should give high score for page with all authority signals', async () => {
      const page: Partial<CrawledPage> = {
        author: 'Dr. Jane Smith, PhD',
        content: 'Scientific research with citations to https://nature.com/article1 and https://nih.gov/study2',
        links: [
          'https://nature.com/article1',
          'https://nih.gov/study2',
          'https://wikipedia.org/topic',
        ],
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      expect(result.score).toBe(100);
      expect(result.metrics.hasAuthor).toBe(true);
      expect(result.metrics.hasCredentials).toBe(true);
      expect(result.metrics.outboundCitations).toBe(3);
      expect(result.metrics.trustedDomainCitations).toBe(3);
      expect(result.issues).toHaveLength(0);
    });

    it('should give low score for page with no authority signals', async () => {
      const page: Partial<CrawledPage> = {
        author: '',
        content: 'Just some content with no citations',
        links: [],
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      expect(result.score).toBe(20);
      expect(result.metrics.hasAuthor).toBe(false);
      expect(result.metrics.hasCredentials).toBe(false);
      expect(result.metrics.outboundCitations).toBe(0);
      expect(result.issues).toContain('No author information found');
      expect(result.issues).toContain('No outbound citations (minimum 2 required)');
    });

    it('should give medium score for vague author without credentials', async () => {
      const page: Partial<CrawledPage> = {
        author: 'John from Marketing',
        content: 'Content with links to https://example.com and https://blog.com',
        links: ['https://example.com', 'https://blog.com'],
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      expect(result.score).toBe(40);
      expect(result.metrics.hasAuthor).toBe(true);
      expect(result.metrics.hasCredentials).toBe(false);
      expect(result.metrics.outboundCitations).toBe(2);
      expect(result.metrics.trustedDomainCitations).toBe(0);
      expect(result.issues).toContain('Author has no visible credentials or expertise indicators');
      expect(result.issues).toContain('No citations to trusted domains');
    });

    it('should detect credentials in author field', async () => {
      const testCases = [
        { author: 'Dr. Smith', hasCredentials: true },
        { author: 'John Doe, MD', hasCredentials: true },
        { author: 'Jane, Ph.D.', hasCredentials: true },
        { author: 'Prof. Johnson', hasCredentials: true },
        { author: 'Mary MBA', hasCredentials: true },
        { author: 'John Smith', hasCredentials: false },
        { author: 'Marketing Team', hasCredentials: false },
      ];

      for (const testCase of testCases) {
        const page: Partial<CrawledPage> = {
          author: testCase.author,
          content: 'Content',
          links: [],
        };

        const result = await analyzer.analyze(page as CrawledPage, {});
        expect(result.metrics.hasCredentials).toBe(testCase.hasCredentials);
      }
    });

    it('should count only trusted domain citations', async () => {
      const page: Partial<CrawledPage> = {
        author: 'Dr. Smith',
        content: 'Research with various citations',
        links: [
          'https://nature.com/article',
          'https://university.edu/study',
          'https://government.gov/report',
          'https://randomsite.com/blog',
          'https://anotherblog.net/post',
        ],
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      expect(result.metrics.outboundCitations).toBe(5);
      expect(result.metrics.trustedDomainCitations).toBe(3);
      expect(result.score).toBe(80);
    });

    it('should handle missing or malformed data gracefully', async () => {
      const page: Partial<CrawledPage> = {
        author: null as any,
        content: null as any,
        links: null as any,
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      expect(result.score).toBe(20);
      expect(result.metrics.hasAuthor).toBe(false);
      expect(result.metrics.outboundCitations).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should calculate score based on authority points', async () => {
      const page: Partial<CrawledPage> = {
        author: 'Jane Smith', // No credentials = 40 points
        content: 'Content with one citation',
        links: ['https://wikipedia.org/topic'], // 1 trusted citation = 20 points
      };

      const result = await analyzer.analyze(page as CrawledPage, {});

      // Total: 40 + 20 = 60 points, which falls in the 41-60 range = score 60
      expect(result.score).toBe(60);
      expect(result.description).toContain('Good but vague');
    });
  });
});