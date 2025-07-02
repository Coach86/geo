import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BatchExecution,
  BatchExecutionDocument,
} from '../schemas/batch-execution.schema';

/**
 * Repository for BatchExecution MongoDB documents
 * Handles all direct interactions with the MongoDB model
 */
@Injectable()
export class BatchExecutionRepository {
  private readonly logger = new Logger(BatchExecutionRepository.name);

  constructor(
    @InjectModel(BatchExecution.name)
    private batchExecutionModel: Model<BatchExecutionDocument>,
  ) {}

  /**
   * Create a new batch execution
   * @param batchExecutionData Data to create the batch execution with
   * @returns The created batch execution document
   */
  async create(batchExecutionData: Partial<BatchExecution>): Promise<BatchExecutionDocument> {
    this.logger.debug(`Creating new batch execution for project ${batchExecutionData.projectId}`);
    const newBatchExecution = new this.batchExecutionModel(batchExecutionData);
    return newBatchExecution.save();
  }

  /**
   * Find a batch execution by its ID
   * @param batchExecutionId The unique ID of the batch execution
   * @returns The batch execution document or null if not found
   */
  async findById(batchExecutionId: string): Promise<BatchExecutionDocument | null> {
    this.logger.debug(`Finding batch execution by ID: ${batchExecutionId}`);
    const batchExecution = await this.batchExecutionModel.findOne({ id: batchExecutionId }).exec();
    return batchExecution;
  }

  /**
   * Find a batch execution by its ID as a lean document (plain JS object)
   * @param batchExecutionId The unique ID of the batch execution
   * @returns The batch execution document as a plain object
   */
  async findByIdLean(batchExecutionId: string): Promise<Record<string, any> | null> {
    this.logger.debug(`Finding batch execution by ID (lean): ${batchExecutionId}`);
    const batchExecution = await this.batchExecutionModel.findOne({ id: batchExecutionId }).lean().exec();
    return batchExecution;
  }

  /**
   * Get all batch executions for a project
   * @param projectId The project ID
   * @returns Array of batch executions sorted by date (newest first)
   */
  async findByProjectId(projectId: string): Promise<Record<string, any>[]> {
    this.logger.debug(`Finding all batch executions for project: ${projectId}`);
    const batchExecutions = await this.batchExecutionModel
      .find({ projectId: projectId })
      .sort({ executedAt: -1 })
      .lean()
      .exec();
    return batchExecutions;
  }


  /**
   * Find batch executions by projectId and status
   * @param projectId The project ID
   * @param status The status of batch executions to find
   * @returns Array of batch executions with the specified status
   */
  async findByProjectIdAndStatus(projectId: string, status: string): Promise<BatchExecutionDocument[]> {
    this.logger.debug(`Finding ${status} batch executions for project: ${projectId}`);
    const batchExecutions = await this.batchExecutionModel
      .find({ projectId: projectId, status })
      .sort({ executedAt: -1 })
      .lean()
      .exec();
    return batchExecutions;
  }



  /**
   * Find the latest batch execution for a project
   * @param projectId The project ID
   * @param status Optional status filter
   * @returns The latest batch execution or null if none exists
   */
  async findLatestByProjectId(
    projectId: string, 
    status?: 'running' | 'completed' | 'failed'
  ): Promise<BatchExecutionDocument | null> {
    this.logger.debug(`Finding latest batch execution for project: ${projectId}${status ? ` with status: ${status}` : ''}`);
    const query: any = { projectId: projectId };
    if (status) {
      query.status = status;
    }
    const batchExecution = await this.batchExecutionModel
      .findOne(query)
      .sort({ executedAt: -1 })
      .exec();
    return batchExecution;
  }


  /**
   * Count how many batch executions exist for a project
   * @param projectId The project ID
   * @returns The number of batch executions
   */
  async countByProjectId(projectId: string): Promise<number> {
    this.logger.debug(`Counting batch executions for project: ${projectId}`);
    return this.batchExecutionModel.countDocuments({ projectId: projectId }).exec();
  }


  /**
   * Update a batch execution by ID
   * @param batchExecutionId The unique ID of the batch execution
   * @param batchExecutionData The data to update
   * @returns The updated batch execution
   */
  async updateById(
    batchExecutionId: string,
    batchExecutionData: Partial<BatchExecution>,
  ): Promise<BatchExecutionDocument | null> {
    this.logger.debug(`Updating batch execution: ${batchExecutionId}`);
    return this.batchExecutionModel
      .findOneAndUpdate({ id: batchExecutionId }, batchExecutionData, { new: true })
      .exec();
  }

  /**
   * Update a batch execution status
   * @param batchExecutionId The unique ID of the batch execution
   * @param status The new status ('running', 'completed', 'failed')
   * @returns The updated batch execution
   */
  async updateStatus(
    batchExecutionId: string,
    status: 'running' | 'completed' | 'failed',
  ): Promise<BatchExecutionDocument | null> {
    this.logger.debug(`Updating batch execution status: ${batchExecutionId} to ${status}`);
    return this.batchExecutionModel
      .findOneAndUpdate({ id: batchExecutionId }, { status }, { new: true })
      .exec();
  }

  /**
   * Delete a batch execution by ID
   * @param batchExecutionId The unique ID of the batch execution
   * @returns True if deleted, false if not found
   */
  async deleteById(batchExecutionId: string): Promise<boolean> {
    this.logger.debug(`Deleting batch execution: ${batchExecutionId}`);
    const result = await this.batchExecutionModel.deleteOne({ id: batchExecutionId }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Delete all batch executions for a project
   * @param projectId The project ID
   * @returns The number of batch executions deleted
   */
  async deleteByProjectId(projectId: string): Promise<number> {
    this.logger.debug(`Deleting all batch executions for project: ${projectId}`);
    const result = await this.batchExecutionModel.deleteMany({ projectId: projectId }).exec();
    return result.deletedCount;
  }


  /**
   * Find stalled batch executions older than a cutoff date
   * @param cutoffDate Date threshold for stalled batches
   * @returns Array of stalled batch executions
   */
  async findStalledExecutions(cutoffDate: Date): Promise<Record<string, any>[]> {
    this.logger.debug(`Finding stalled batch executions older than: ${cutoffDate.toISOString()}`);
    const stalledBatches = await this.batchExecutionModel
      .find({
        status: 'running',
        createdAt: { $lt: cutoffDate }
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return stalledBatches;
  }

  /**
   * Find batch executions by criteria
   * @param criteria The search criteria
   * @returns Array of batch executions
   */
  async find(criteria: any): Promise<Record<string, any>[]> {
    this.logger.debug(`Finding batch executions with criteria: ${JSON.stringify(criteria)}`);
    return this.batchExecutionModel.find(criteria).lean().exec();
  }

  /**
   * Aggregate batch executions
   * @param pipeline The aggregation pipeline
   * @returns Aggregation results
   */
  async aggregate(pipeline: any[]): Promise<any[]> {
    this.logger.debug(`Aggregating batch executions`);
    return this.batchExecutionModel.aggregate(pipeline).exec();
  }
}