import { Test, TestingModule } from '@nestjs/testing';
import { BrandReportService } from './brand-report.service';
import { getModelToken } from '@nestjs/mongoose';
import { CitationItemDto } from '../dto/citation-item.dto';

describe('BrandReportService - Citation Aggregation', () => {
  let service: BrandReportService;

  const mockBrandReportModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandReportService,
        {
          provide: getModelToken('BrandReport'),
          useValue: mockBrandReportModel,
        },
      ],
    }).compile();

    service = module.get<BrandReportService>(BrandReportService);
  });

  describe('aggregateCitation', () => {
    it('should create new citation when none exists', () => {
      const citationMap: Map<string, CitationItemDto> = new Map();
      const citation = { url: 'https://example.com', title: 'Test' };
      
      service['aggregateCitation'](
        citationMap,
        citation,
        'example.com',
        'https://example.com',
        'test prompt',
        'positive',
        85,
        'gpt-4',
        'Test Title',
        'Test text'
      );

      const result = citationMap.get('example.com_https://example.com');
      expect(result).toEqual({
        domain: 'example.com',
        url: 'https://example.com',
        title: 'Test Title',
        prompts: ['test prompt'],
        sentiments: ['positive'],
        scores: [85],
        count: 1,
        models: ['gpt-4'],
        text: 'Test text'
      });
    });

    it('should aggregate arrays when citation exists', () => {
      const citationMap: Map<string, CitationItemDto> = new Map();
      const citation = { url: 'https://example.com', title: 'Test' };
      
      // First citation
      service['aggregateCitation'](
        citationMap,
        citation,
        'example.com',
        'https://example.com',
        'first prompt',
        'positive',
        85,
        'gpt-4',
        'Test Title',
        'Test text'
      );

      // Second citation with different values
      service['aggregateCitation'](
        citationMap,
        citation,
        'example.com',
        'https://example.com',
        'second prompt',
        'neutral',
        92,
        'claude-3',
        'Test Title',
        'Test text'
      );

      const result = citationMap.get('example.com_https://example.com');
      expect(result?.count).toBe(2);
      expect(result?.prompts).toEqual(['first prompt', 'second prompt']);
      expect(result?.sentiments).toEqual(['positive', 'neutral']);
      expect(result?.scores).toEqual([85, 92]);
      expect(result?.models).toEqual(['gpt-4', 'claude-3']);
    });

    it('should deduplicate array values', () => {
      const citationMap: Map<string, CitationItemDto> = new Map();
      const citation = { url: 'https://example.com', title: 'Test' };
      
      // First citation
      service['aggregateCitation'](
        citationMap,
        citation,
        'example.com',
        'https://example.com',
        'same prompt',
        'positive',
        85,
        'gpt-4',
        'Test Title',
        'Test text'
      );

      // Second citation with same values
      service['aggregateCitation'](
        citationMap,
        citation,
        'example.com',
        'https://example.com',
        'same prompt', // duplicate
        'positive',   // duplicate
        85,           // duplicate
        'gpt-4',      // duplicate
        'Test Title',
        'Test text'
      );

      const result = citationMap.get('example.com_https://example.com');
      expect(result?.count).toBe(2);
      expect(result?.prompts).toEqual(['same prompt']); // deduplicated
      expect(result?.sentiments).toEqual(['positive']); // deduplicated
      expect(result?.scores).toEqual([85]); // deduplicated
      expect(result?.models).toEqual(['gpt-4']); // deduplicated
    });

    it('should handle undefined optional values', () => {
      const citationMap: Map<string, CitationItemDto> = new Map();
      const citation = { url: 'https://example.com', title: 'Test' };
      
      service['aggregateCitation'](
        citationMap,
        citation,
        'example.com',
        'https://example.com',
        'test prompt',
        undefined, // no sentiment
        undefined, // no score
        'gpt-4',
        'Test Title',
        undefined  // no text
      );

      const result = citationMap.get('example.com_https://example.com');
      expect(result?.prompts).toEqual(['test prompt']);
      expect(result?.sentiments).toBeUndefined();
      expect(result?.scores).toBeUndefined();
      expect(result?.models).toEqual(['gpt-4']);
      expect(result?.text).toBeUndefined();
    });

    it('should handle empty prompt string', () => {
      const citationMap: Map<string, CitationItemDto> = new Map();
      const citation = { url: 'https://example.com', title: 'Test' };
      
      service['aggregateCitation'](
        citationMap,
        citation,
        'example.com',
        'https://example.com',
        '', // empty prompt
        'positive',
        85,
        'gpt-4',
        'Test Title',
        'Test text'
      );

      const result = citationMap.get('example.com_https://example.com');
      expect(result?.prompts).toEqual([]); // empty prompt not added
    });
  });
});