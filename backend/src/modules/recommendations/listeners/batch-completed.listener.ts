import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { RecommendationEngineService } from '../services/recommendation-engine.service';
import { RecommendationEventsGateway } from '../gateways/recommendation-events.gateway';

@Injectable()
export class BatchCompletedListener {
  private readonly logger = new Logger(BatchCompletedListener.name);

  constructor(
    private readonly recommendationEngine: RecommendationEngineService,
    private readonly recommendationGateway: RecommendationEventsGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('batch.completed')
  async handleBatchCompleted(payload: {
    batchExecutionId: string;
    projectIds: string[];
    timestamp: Date;
  }) {
    this.logger.log(
      `Received batch.completed event for ${payload.batchExecutionId}`,
    );

    try {
      this.recommendationGateway.emitBatchAnalysisStarted(
        payload.batchExecutionId,
      );

      const result = await this.recommendationEngine.analyzeFromBatch(
        payload.batchExecutionId,
      );

      this.recommendationGateway.emitBatchAnalysisCompleted(
        payload.batchExecutionId,
        result,
      );

      this.eventEmitter.emit('recommendations.batch.completed', {
        batchExecutionId: payload.batchExecutionId,
        ...result,
        timestamp: new Date(),
      });

      this.logger.log(
        `Completed recommendation analysis for batch ${payload.batchExecutionId}. ` +
        `Analyzed ${result.projectsAnalyzed} projects, generated ${result.totalRecommendations} recommendations`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to analyze batch ${payload.batchExecutionId}: ${error.message}`,
        error.stack,
      );

      this.eventEmitter.emit('recommendations.batch.failed', {
        batchExecutionId: payload.batchExecutionId,
        error: error.message,
        timestamp: new Date(),
      });
    }
  }

  @OnEvent('project.analysis.requested')
  async handleProjectAnalysisRequested(payload: {
    projectId: string;
    organizationId: string;
    userId: string;
  }) {
    this.logger.log(
      `Received project.analysis.requested event for ${payload.projectId}`,
    );

    try {
      this.recommendationGateway.emitAnalysisStarted(payload.projectId);

      const result = await this.recommendationEngine.analyzeProject(
        payload.projectId,
      );

      this.recommendationGateway.emitAnalysisCompleted(
        payload.projectId,
        {
          recommendationsGenerated: result.recommendationsGenerated,
          executionTime: Date.now(),
        },
      );

      this.eventEmitter.emit('recommendations.project.completed', {
        projectId: payload.projectId,
        organizationId: payload.organizationId,
        ...result,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to analyze project ${payload.projectId}: ${error.message}`,
        error.stack,
      );

      this.eventEmitter.emit('recommendations.project.failed', {
        projectId: payload.projectId,
        organizationId: payload.organizationId,
        error: error.message,
        timestamp: new Date(),
      });
    }
  }

  @OnEvent('recommendation.status.updated')
  handleRecommendationStatusUpdated(payload: {
    recommendationId: string;
    projectId: string;
    previousStatus: string;
    newStatus: string;
    updatedBy: string;
  }) {
    this.logger.log(
      `Recommendation ${payload.recommendationId} status updated from ${payload.previousStatus} to ${payload.newStatus}`,
    );

    this.recommendationGateway.emitRecommendationUpdated(
      payload.projectId,
      {
        id: payload.recommendationId,
        status: payload.newStatus,
        updatedBy: payload.updatedBy,
      },
    );
  }
}