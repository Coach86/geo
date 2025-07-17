import { Test, TestingModule } from '@nestjs/testing';
import { EntityGapAnalyzer } from '../analyzers/entity-gap.analyzer';
import { BrandReport } from '../../report/schemas/brand-report.schema';
import { RecommendationType } from '../interfaces/recommendation.interfaces';

describe('EntityGapAnalyzer', () => {
  let analyzer: EntityGapAnalyzer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntityGapAnalyzer],
    }).compile();

    analyzer = module.get<EntityGapAnalyzer>(EntityGapAnalyzer);
  });

  it('should be defined', () => {
    expect(analyzer).toBeDefined();
  });

  it('should return entity gap recommendation when models have zero visibility', async () => {
    const mockReport = {
      visibility: {
        overallMentionRate: 0.05,
        modelVisibility: [
          { model: 'gpt-4', mentionRate: 0 },
          { model: 'claude-2', mentionRate: 0 },
          { model: 'gemini-pro', mentionRate: 0.1 },
        ],
      },
    } as BrandReport;

    const recommendations = await analyzer.analyzeProject('test-project', mockReport);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].type).toBe(RecommendationType.ENTITY_GAP);
    expect(recommendations[0].title).toContain('Zero brand recognition');
    expect(recommendations[0].evidence).toHaveLength(3); // No visibility, low visibility, overall low
  });

  it('should return empty array when visibility is good', async () => {
    const mockReport = {
      visibility: {
        overallMentionRate: 0.8,
        modelVisibility: [
          { model: 'gpt-4', mentionRate: 0.85 },
          { model: 'claude-2', mentionRate: 0.75 },
          { model: 'gemini-pro', mentionRate: 0.8 },
        ],
      },
    } as BrandReport;

    const recommendations = await analyzer.analyzeProject('test-project', mockReport);

    expect(recommendations).toHaveLength(0);
  });

  it('should handle missing visibility data gracefully', async () => {
    const mockReport = {} as BrandReport;

    const recommendations = await analyzer.analyzeProject('test-project', mockReport);

    expect(recommendations).toHaveLength(0);
  });

  it('should calculate correct confidence and impact scores', async () => {
    const mockReport = {
      visibility: {
        overallMentionRate: 0.15,
        modelVisibility: [
          { model: 'gpt-4', mentionRate: 0.2 },
          { model: 'claude-2', mentionRate: 0.1 },
          { model: 'gemini-pro', mentionRate: 0.15 },
        ],
      },
    } as BrandReport;

    const recommendations = await analyzer.analyzeProject('test-project', mockReport);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].confidenceScore).toBeGreaterThan(0.7);
    expect(recommendations[0].impactScore).toBeGreaterThan(0.8);
  });
});