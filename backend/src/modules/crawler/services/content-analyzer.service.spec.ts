import { Test, TestingModule } from '@nestjs/testing';
import { ContentAnalyzerService } from './content-analyzer.service';
import { ScoringRulesService } from './scoring-rules.service';
import { AuthorityAnalyzer } from '../analyzers/authority.analyzer';
import { FreshnessAnalyzer } from '../analyzers/freshness.analyzer';
import { StructureAnalyzer } from '../analyzers/structure.analyzer';
import { SnippetAnalyzer } from '../analyzers/snippet.analyzer';
import { BrandAlignmentAnalyzer } from '../analyzers/brand-alignment.analyzer';
import { ContentScoreRepository } from '../repositories/content-score.repository';
import { CrawledPage } from '../schemas/crawled-page.schema';

describe('ContentAnalyzerService', () => {
  let service: ContentAnalyzerService;
  let contentScoreRepository: jest.Mocked<ContentScoreRepository>;
  let scoringRulesService: jest.Mocked<ScoringRulesService>;
  let authorityAnalyzer: jest.Mocked<AuthorityAnalyzer>;
  let freshnessAnalyzer: jest.Mocked<FreshnessAnalyzer>;
  let structureAnalyzer: jest.Mocked<StructureAnalyzer>;
  let snippetAnalyzer: jest.Mocked<SnippetAnalyzer>;
  let brandAlignmentAnalyzer: jest.Mocked<BrandAlignmentAnalyzer>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentAnalyzerService,
        {
          provide: ContentScoreRepository,
          useValue: {
            create: jest.fn(),
            findByProjectId: jest.fn(),
            update: jest.fn(),
            deleteByProjectId: jest.fn(),
          },
        },
        {
          provide: ScoringRulesService,
          useValue: {
            getRules: jest.fn(),
            getDimensionWeight: jest.fn(),
          },
        },
        {
          provide: AuthorityAnalyzer,
          useValue: {
            analyze: jest.fn(),
          },
        },
        {
          provide: FreshnessAnalyzer,
          useValue: {
            analyze: jest.fn(),
          },
        },
        {
          provide: StructureAnalyzer,
          useValue: {
            analyze: jest.fn(),
          },
        },
        {
          provide: SnippetAnalyzer,
          useValue: {
            analyze: jest.fn(),
          },
        },
        {
          provide: BrandAlignmentAnalyzer,
          useValue: {
            analyze: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContentAnalyzerService>(ContentAnalyzerService);
    contentScoreRepository = module.get(ContentScoreRepository);
    scoringRulesService = module.get(ScoringRulesService);
    authorityAnalyzer = module.get(AuthorityAnalyzer);
    freshnessAnalyzer = module.get(FreshnessAnalyzer);
    structureAnalyzer = module.get(StructureAnalyzer);
    snippetAnalyzer = module.get(SnippetAnalyzer);
    brandAlignmentAnalyzer = module.get(BrandAlignmentAnalyzer);
  });

  describe('analyzePage', () => {
    it('should analyze a page and calculate global score correctly', async () => {
      const mockPage: Partial<CrawledPage> = {
        _id: 'page-1',
        projectId: 'project-1',
        url: 'https://example.com',
        title: 'Test Page',
        content: 'Test content',
        author: 'John Doe',
        publishedDate: new Date('2024-01-01'),
        structuredData: [],
        headings: { h1: ['Main'], h2: ['Sub'] },
      };

      const mockScores = {
        authority: { score: 80, metrics: {}, issues: [] },
        freshness: { score: 90, metrics: {}, issues: [] },
        structure: { score: 70, metrics: {}, issues: [] },
        snippet: { score: 85, metrics: {}, issues: [] },
        brandAlignment: { score: 75, metrics: {}, issues: [] },
      };

      authorityAnalyzer.analyze.mockResolvedValue(mockScores.authority);
      freshnessAnalyzer.analyze.mockResolvedValue(mockScores.freshness);
      structureAnalyzer.analyze.mockResolvedValue(mockScores.structure);
      snippetAnalyzer.analyze.mockResolvedValue(mockScores.snippet);
      brandAlignmentAnalyzer.analyze.mockResolvedValue(mockScores.brandAlignment);

      scoringRulesService.getDimensionWeight.mockImplementation((dimension) => {
        const weights = {
          freshness: 2.5,
          structure: 1.5,
          authority: 1.0,
          brandAlignment: 1.0,
          snippet: 1.0,
        };
        return weights[dimension] || 1.0;
      });

      contentScoreRepository.create.mockResolvedValue({
        _id: 'score-1',
        pageId: 'page-1',
        projectId: 'project-1',
        globalScore: 81.5,
        dimensionScores: mockScores,
      } as any);

      const result = await service.analyzePage(mockPage as CrawledPage, { brandName: 'TestBrand' });

      expect(result.globalScore).toBeCloseTo(81.5, 1);
      expect(authorityAnalyzer.analyze).toHaveBeenCalledWith(mockPage, expect.any(Object));
      expect(freshnessAnalyzer.analyze).toHaveBeenCalledWith(mockPage, expect.any(Object));
      expect(structureAnalyzer.analyze).toHaveBeenCalledWith(mockPage, expect.any(Object));
      expect(snippetAnalyzer.analyze).toHaveBeenCalledWith(mockPage, expect.any(Object));
      expect(brandAlignmentAnalyzer.analyze).toHaveBeenCalledWith(mockPage, expect.any(Object));
    });

    it('should handle analyzer errors gracefully', async () => {
      const mockPage: Partial<CrawledPage> = {
        _id: 'page-1',
        projectId: 'project-1',
        url: 'https://example.com',
      };

      authorityAnalyzer.analyze.mockRejectedValue(new Error('Analysis failed'));
      freshnessAnalyzer.analyze.mockResolvedValue({ score: 50, metrics: {}, issues: [] });
      structureAnalyzer.analyze.mockResolvedValue({ score: 50, metrics: {}, issues: [] });
      snippetAnalyzer.analyze.mockResolvedValue({ score: 50, metrics: {}, issues: [] });
      brandAlignmentAnalyzer.analyze.mockResolvedValue({ score: 50, metrics: {}, issues: [] });

      scoringRulesService.getDimensionWeight.mockReturnValue(1.0);

      const result = await service.analyzePage(mockPage as CrawledPage, {});

      // Should use default score for failed analyzer
      expect(result.dimensionScores.authority.score).toBe(0);
      expect(result.dimensionScores.authority.issues).toContain('Analysis failed: Analysis failed');
    });
  });

  describe('analyzeProject', () => {
    it('should analyze all pages in a project', async () => {
      const projectId = 'project-1';
      const mockPages = [
        { _id: 'page-1', url: 'https://example.com/1' },
        { _id: 'page-2', url: 'https://example.com/2' },
      ];

      service.analyzePage = jest.fn().mockResolvedValue({
        globalScore: 80,
        dimensionScores: {},
      });

      const result = await service.analyzeProject(projectId, mockPages as CrawledPage[], {});

      expect(service.analyzePage).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('should handle empty page list', async () => {
      const result = await service.analyzeProject('project-1', [], {});
      expect(result).toEqual([]);
    });
  });

  describe('getProjectReport', () => {
    it('should generate a comprehensive project report', async () => {
      const projectId = 'project-1';
      const mockScores = [
        {
          _id: 'score-1',
          pageId: 'page-1',
          projectId,
          url: 'https://example.com/1',
          globalScore: 80,
          dimensionScores: {
            authority: { score: 80, metrics: { hasAuthor: true }, issues: [] },
            freshness: { score: 90, metrics: { daysSinceUpdate: 5 }, issues: [] },
            structure: { score: 70, metrics: { hasH1: true }, issues: ['Missing meta description'] },
            snippet: { score: 85, metrics: { hasStructuredData: true }, issues: [] },
            brandAlignment: { score: 75, metrics: { brandMentions: 3 }, issues: [] },
          },
          analyzedAt: new Date(),
        },
        {
          _id: 'score-2',
          pageId: 'page-2',
          projectId,
          url: 'https://example.com/2',
          globalScore: 70,
          dimensionScores: {
            authority: { score: 60, metrics: { hasAuthor: false }, issues: ['No author information'] },
            freshness: { score: 80, metrics: { daysSinceUpdate: 30 }, issues: [] },
            structure: { score: 60, metrics: { hasH1: false }, issues: ['No H1 tag', 'Missing meta description'] },
            snippet: { score: 70, metrics: { hasStructuredData: false }, issues: [] },
            brandAlignment: { score: 65, metrics: { brandMentions: 1 }, issues: [] },
          },
          analyzedAt: new Date(),
        },
      ];

      contentScoreRepository.findByProjectId.mockResolvedValue(mockScores as any);

      const report = await service.getProjectReport(projectId);

      expect(report.projectId).toBe(projectId);
      expect(report.summary.totalPages).toBe(2);
      expect(report.summary.avgGlobalScore).toBe(75);
      expect(report.summary.scoreBreakdown.authority).toBe(70);
      expect(report.summary.scoreBreakdown.freshness).toBe(85);
      expect(report.summary.scoreBreakdown.structure).toBe(65);
      expect(report.summary.scoreBreakdown.snippet).toBe(77.5);
      expect(report.summary.scoreBreakdown.brandAlignment).toBe(70);
      expect(report.criticalIssuesCount).toBe(3); // 3 structure issues total
      expect(report.pageScores).toHaveLength(2);
    });

    it('should handle empty scores', async () => {
      contentScoreRepository.findByProjectId.mockResolvedValue([]);

      const report = await service.getProjectReport('project-1');

      expect(report.summary.totalPages).toBe(0);
      expect(report.summary.avgGlobalScore).toBe(0);
      expect(report.criticalIssuesCount).toBe(0);
      expect(report.pageScores).toEqual([]);
    });
  });
});