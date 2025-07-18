import { Injectable, Logger } from '@nestjs/common';
import { BatchExecutionRepository } from '../repositories/batch-execution.repository';
import { BatchResultRepository } from '../repositories/batch-result.repository';
import { RawResponseRepository } from '../repositories/raw-response.repository';
import { BatchExecutionService } from './batch-execution.service';

/**
 * Service responsible for tracking and managing batch executions.
 * Handles creation, completion, failure tracking, and status updates.
 */
@Injectable()
export class BatchExecutionTrackingService {
  private readonly logger = new Logger(BatchExecutionTrackingService.name);

  constructor(
    private readonly batchExecutionRepository: BatchExecutionRepository,
    private readonly batchResultRepository: BatchResultRepository,
    private readonly rawResponseRepository: RawResponseRepository,
    private readonly batchExecutionService: BatchExecutionService,
  ) {}

  /**
   * Get running batch executions for a project
   * @param projectId The ID of the project
   * @returns Array of running batch executions sorted by executedAt (newest first)
   */
  async getRunningBatchExecutionsByProject(projectId: string): Promise<any[]> {
    try {
      return await this.batchExecutionRepository.findByProjectIdAndStatus(projectId, 'running');
    } catch (error) {
      this.logger.error(`Failed to get running batch executions: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Create a batch execution record
   * @param projectId The ID of the project
   * @param triggerSource The source that triggered the batch ('cron', 'manual', 'project_creation')
   * @returns The created batch execution
   */
  async createBatchExecution(
    projectId: string,
    triggerSource: 'cron' | 'manual' | 'project_creation' = 'manual',
  ): Promise<any> {
    this.logger.log(
      `Creating batch execution for project ${projectId} (trigger: ${triggerSource})`,
    );

    try {
      return await this.batchExecutionService.createBatchExecution(projectId, triggerSource);
    } catch (error) {
      this.logger.error(`Failed to create batch execution: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Complete a batch execution with results
   * @param batchExecutionId The ID of the batch execution
   * @param result The result of the batch execution
   * @returns The updated batch execution
   */
  async completeBatchExecution(batchExecutionId: string, result: any): Promise<any> {
    this.logger.log(`Completing batch execution ${batchExecutionId}`);

    try {
      // If the result contains results for different pipelines, save them individually
      if (result && result.results) {
        // Check which pipeline results are available
        if (result.results.visibility) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'visibility',
            result.results.visibility,
          );
        }

        if (result.results.sentiment) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'sentiment',
            result.results.sentiment,
          );
        }

        if (result.results.alignment) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'alignment',
            result.results.alignment,
          );
        }

        if (result.results.competition) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'competition',
            result.results.competition,
          );
        }
      }

      // Update the batch execution status to completed
      return await this.batchExecutionService.updateBatchExecutionStatus(
        batchExecutionId,
        'completed',
      );
    } catch (error) {
      this.logger.error(`Failed to complete batch execution: ${error.message}`, error.stack);

      // If saving results fails, mark the batch execution as failed
      await this.failBatchExecution(
        batchExecutionId,
        error.message || 'Unknown error during completion',
      );
      throw error;
    }
  }

  /**
   * Mark a batch execution as failed
   * @param batchExecutionId The ID of the batch execution
   * @param errorMessage The error message
   * @returns The updated batch execution
   */
  async failBatchExecution(batchExecutionId: string, errorMessage: string): Promise<any> {
    this.logger.error(`Marking batch execution ${batchExecutionId} as failed: ${errorMessage}`);

    try {
      return await this.batchExecutionService.updateBatchExecutionStatus(
        batchExecutionId,
        'failed',
        errorMessage,
      );
    } catch (error) {
      this.logger.error(`Failed to mark batch execution as failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a batch execution for a single pipeline run
   * @param projectId The ID of the project
   * @param pipelineType The type of pipeline being run
   * @returns The created batch execution
   */
  async createSinglePipelineBatchExecution(
    projectId: string,
    pipelineType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
  ): Promise<any> {
    this.logger.log(
      `Creating batch execution for ${pipelineType} pipeline for project ${projectId}`,
    );

    try {
      // Create a new batch execution using the batch execution service
      const batchExecution = await this.batchExecutionService.createBatchExecution(projectId);

      this.logger.log(`Created batch execution ${batchExecution.id} for ${pipelineType} pipeline`);

      return batchExecution;
    } catch (error) {
      this.logger.error(
        `Failed to create batch execution for ${pipelineType} pipeline: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Save the result of a single pipeline run
   * @param batchExecutionId The ID of the batch execution
   * @param pipelineType The type of pipeline
   * @param result The result to save
   * @returns The saved batch result
   */
  async saveSinglePipelineResult(
    batchExecutionId: string,
    pipelineType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
    result: any,
  ): Promise<any> {
    this.logger.log(`Saving ${pipelineType} result for batch execution ${batchExecutionId}`);

    try {
      // Save the result using the batch execution service
      const batchResult = await this.batchExecutionService.saveBatchResult(
        batchExecutionId,
        pipelineType,
        result,
      );

      this.logger.log(`Saved ${pipelineType} result for batch execution ${batchExecutionId}`);

      return batchResult;
    } catch (error) {
      this.logger.error(`Failed to save ${pipelineType} result: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark a single pipeline batch execution as completed
   * @param batchExecutionId The ID of the batch execution
   * @returns The updated batch execution
   */
  async completeSinglePipelineBatchExecution(batchExecutionId: string): Promise<any> {
    this.logger.log(`Marking batch execution ${batchExecutionId} as completed`);

    try {
      // Update the status using the batch execution service
      const batchExecution = await this.batchExecutionService.updateBatchExecutionStatus(
        batchExecutionId,
        'completed',
      );

      this.logger.log(`Marked batch execution ${batchExecutionId} as completed`);

      return batchExecution;
    } catch (error) {
      this.logger.error(
        `Failed to mark batch execution as completed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Mark a single pipeline batch execution as failed
   * @param batchExecutionId The ID of the batch execution
   * @param errorMessage The error message
   * @returns The updated batch execution
   */
  async failSinglePipelineBatchExecution(
    batchExecutionId: string,
    errorMessage: string,
  ): Promise<any> {
    this.logger.error(`Marking batch execution ${batchExecutionId} as failed: ${errorMessage}`);

    try {
      // Update the status using the batch execution service
      const batchExecution = await this.batchExecutionService.updateBatchExecutionStatus(
        batchExecutionId,
        'failed',
      );

      this.logger.log(`Marked batch execution ${batchExecutionId} as failed`);

      return batchExecution;
    } catch (error) {
      this.logger.error(`Failed to mark batch execution as failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Clean up batch data for a deleted project
   * @param projectId The ID of the deleted project
   */
  async cleanupProjectBatchData(projectId: string): Promise<void> {
    // Get execution IDs before deletion to clean up related data
    const batchExecutions = await this.batchExecutionRepository.findByProjectId(projectId);
    const batchExecutionIds = batchExecutions.map((be) => be.id);

    if (batchExecutionIds.length > 0) {
      // Delete related raw responses and batch results first
      for (const execId of batchExecutionIds) {
        await this.rawResponseRepository.deleteByExecutionId(execId);
        await this.batchResultRepository.deleteByExecutionId(execId);
      }
    }

    // Delete all batch executions for this project
    const deletedCount = await this.batchExecutionRepository.deleteByProjectId(projectId);

    this.logger.log(
      `Cleaned up batch data for deleted project ${projectId}: ${deletedCount} executions, ${batchExecutionIds.length} related records`,
    );
  }
}