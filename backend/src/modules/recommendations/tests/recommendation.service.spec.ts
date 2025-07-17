import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationService } from '../services/recommendation.service';
import { RecommendationRepository } from '../repositories/recommendation.repository';
import { RecommendationEngineService } from '../services/recommendation-engine.service';
import { RecommendationStatus, RecommendationPriority } from '../interfaces/recommendation.interfaces';
import { NotFoundException } from '@nestjs/common';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let repository: jest.Mocked<RecommendationRepository>;
  let engine: jest.Mocked<RecommendationEngineService>;

  const mockRecommendation = {
    id: 'rec-123',
    projectId: 'proj-123',
    organizationId: 'org-123',
    type: 'entity_gap',
    priority: RecommendationPriority.HIGH,
    title: 'Test Recommendation',
    description: 'Test Description',
    status: RecommendationStatus.NEW,
    confidenceScore: 0.85,
    impactScore: 0.9,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: RecommendationRepository,
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: RecommendationEngineService,
          useValue: {
            analyzeProject: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    repository = module.get(RecommendationRepository);
    engine = module.get(RecommendationEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated recommendations', async () => {
      const mockRecommendations = [mockRecommendation];
      repository.find.mockResolvedValue(mockRecommendations);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll(
        { organizationId: 'org-123' },
        { limit: 10, offset: 0 }
      );

      expect(result.recommendations).toEqual(mockRecommendations);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });
  });

  describe('findById', () => {
    it('should return recommendation by id', async () => {
      repository.findOne.mockResolvedValue(mockRecommendation);

      const result = await service.findById('rec-123', 'org-123');

      expect(result).toEqual(mockRecommendation);
      expect(repository.findOne).toHaveBeenCalledWith({
        id: 'rec-123',
        organizationId: 'org-123',
      });
    });

    it('should return null if not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findById('rec-123', 'org-123');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update recommendation status', async () => {
      repository.findOne.mockResolvedValue(mockRecommendation);
      repository.update.mockResolvedValue({
        ...mockRecommendation,
        status: RecommendationStatus.IN_PROGRESS,
      });

      const result = await service.updateStatus(
        'rec-123',
        'org-123',
        RecommendationStatus.IN_PROGRESS
      );

      expect(result.status).toBe(RecommendationStatus.IN_PROGRESS);
    });

    it('should throw NotFoundException if recommendation not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('rec-123', 'org-123', RecommendationStatus.IN_PROGRESS)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('dismiss', () => {
    it('should dismiss recommendation', async () => {
      repository.findOne.mockResolvedValue(mockRecommendation);
      repository.update.mockResolvedValue({
        ...mockRecommendation,
        status: RecommendationStatus.DISMISSED,
      });

      const result = await service.dismiss('rec-123', 'org-123');

      expect(result.status).toBe(RecommendationStatus.DISMISSED);
    });
  });

  describe('getProjectSummary', () => {
    it('should return project recommendation summary', async () => {
      const mockRecommendations = [
        { ...mockRecommendation, type: 'entity_gap', priority: RecommendationPriority.HIGH },
        { ...mockRecommendation, type: 'feature_gap', priority: RecommendationPriority.MEDIUM },
      ];
      
      repository.find.mockResolvedValue(mockRecommendations);

      const result = await service.getProjectSummary('proj-123', 'org-123');

      expect(result.total).toBe(2);
      expect(result.byType['entity_gap']).toBe(1);
      expect(result.byType['feature_gap']).toBe(1);
      expect(result.byPriority[RecommendationPriority.HIGH]).toBe(1);
      expect(result.byPriority[RecommendationPriority.MEDIUM]).toBe(1);
    });
  });

  describe('triggerAnalysis', () => {
    it('should trigger project analysis', async () => {
      engine.analyzeProject.mockResolvedValue({
        recommendationsGenerated: 5,
        metadata: {} as any,
      });

      const result = await service.triggerAnalysis('proj-123', 'org-123');

      expect(result.message).toBe('Analysis completed successfully');
      expect(result.recommendationsGenerated).toBe(5);
      expect(engine.analyzeProject).toHaveBeenCalledWith('proj-123', 'org-123');
    });
  });
});