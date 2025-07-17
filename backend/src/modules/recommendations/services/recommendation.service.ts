import { Injectable, NotFoundException } from '@nestjs/common';
import { RecommendationRepository } from '../repositories/recommendation.repository';
import { RecommendationEngineService } from './recommendation-engine.service';
import { 
  RecommendationStatus, 
  RecommendationType,
  RecommendationPriority 
} from '../interfaces/recommendation.interfaces';
import { Recommendation } from '../schemas/recommendation.schema';

@Injectable()
export class RecommendationService {
  constructor(
    private readonly recommendationRepository: RecommendationRepository,
    private readonly recommendationEngine: RecommendationEngineService,
  ) {}

  async findAll(
    filters: any,
    pagination: { limit: number; offset: number },
  ): Promise<{
    recommendations: Recommendation[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const [recommendations, total] = await Promise.all([
      this.recommendationRepository.find(filters, pagination),
      this.recommendationRepository.count(filters),
    ]);

    return {
      recommendations,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<Recommendation | null> {
    return this.recommendationRepository.findOne({
      id,
      organizationId,
    });
  }

  async updateStatus(
    id: string,
    organizationId: string,
    status: RecommendationStatus,
  ): Promise<Recommendation> {
    const recommendation = await this.findById(id, organizationId);
    
    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    const updated = await this.recommendationRepository.update(
      { id, organizationId },
      { status },
    );
    
    if (!updated) {
      throw new NotFoundException('Failed to update recommendation');
    }
    
    return updated;
  }

  async dismiss(
    id: string,
    organizationId: string,
  ): Promise<Recommendation> {
    return this.updateStatus(id, organizationId, RecommendationStatus.DISMISSED);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const recommendation = await this.findById(id, organizationId);
    
    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    await this.recommendationRepository.delete({ id, organizationId });
  }

  async getProjectSummary(
    projectId: string,
    organizationId: string,
  ): Promise<{
    total: number;
    byType: Record<RecommendationType, number>;
    byPriority: Record<RecommendationPriority, number>;
    byStatus: Record<RecommendationStatus, number>;
    lastAnalyzed: Date | null;
  }> {
    const recommendations = await this.recommendationRepository.find(
      { projectId, organizationId },
      { limit: 1000, offset: 0 },
    );

    const summary = {
      total: recommendations.length,
      byType: {} as Record<RecommendationType, number>,
      byPriority: {} as Record<RecommendationPriority, number>,
      byStatus: {} as Record<RecommendationStatus, number>,
      lastAnalyzed: recommendations.length > 0
        ? recommendations[0].createdAt
        : null,
    };

    for (const recommendation of recommendations) {
      summary.byType[recommendation.type] =
        (summary.byType[recommendation.type] || 0) + 1;
      summary.byPriority[recommendation.priority] =
        (summary.byPriority[recommendation.priority] || 0) + 1;
      summary.byStatus[recommendation.status] =
        (summary.byStatus[recommendation.status] || 0) + 1;
    }

    return summary;
  }

  async triggerAnalysis(
    projectId: string,
    organizationId: string,
  ): Promise<{
    message: string;
    recommendationsGenerated: number;
  }> {
    const results = await this.recommendationEngine.analyzeProject(
      projectId,
    );

    return {
      message: 'Analysis completed successfully',
      recommendationsGenerated: results.recommendationsGenerated,
    };
  }

  async findByProject(
    projectId: string,
    options?: {
      type?: RecommendationType;
      status?: RecommendationStatus;
      limit?: number;
    },
  ): Promise<Recommendation[]> {
    const filters = {
      projectId,
      ...(options?.type && { type: options.type }),
      ...(options?.status && { status: options.status }),
    };

    const pagination = {
      limit: options?.limit || 10,
      offset: 0,
    };

    const result = await this.recommendationRepository.find(filters, pagination);
    return result;
  }

  async markAsImplemented(
    recommendationIds: string[],
    organizationId: string,
  ): Promise<void> {
    await Promise.all(
      recommendationIds.map(id =>
        this.updateStatus(id, organizationId, RecommendationStatus.IMPLEMENTED),
      ),
    );
  }

  async getActiveRecommendationCount(
    projectId: string,
  ): Promise<number> {
    return this.recommendationRepository.count({
      projectId,
      status: { $in: [RecommendationStatus.NEW, RecommendationStatus.IN_PROGRESS] },
    });
  }
}