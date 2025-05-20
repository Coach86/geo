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
    this.logger.debug(`Creating new batch execution for company ${batchExecutionData.companyId}`);
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
   * Get all batch executions for a company
   * @param companyId The company ID
   * @returns Array of batch executions sorted by date (newest first)
   */
  async findAllByCompanyId(companyId: string): Promise<Record<string, any>[]> {
    this.logger.debug(`Finding all batch executions for company: ${companyId}`);
    const batchExecutions = await this.batchExecutionModel
      .find({ companyId })
      .sort({ executedAt: -1 })
      .lean()
      .exec();
    return batchExecutions;
  }

  /**
   * Find batch executions by companyId and status
   * @param companyId The company ID
   * @param status The status of batch executions to find
   * @returns Array of batch executions with the specified status
   */
  async findByCompanyIdAndStatus(companyId: string, status: string): Promise<BatchExecutionDocument[]> {
    this.logger.debug(`Finding ${status} batch executions for company: ${companyId}`);
    const batchExecutions = await this.batchExecutionModel
      .find({ companyId, status })
      .sort({ executedAt: -1 })
      .lean()
      .exec();
    return batchExecutions;
  }

  /**
   * Find all batch executions for a company
   * @param companyId The company ID
   * @returns Array of batch executions as plain objects
   */
  async findByCompanyId(companyId: string): Promise<Record<string, any>[]> {
    this.logger.debug(`Finding batch executions for company: ${companyId}`);
    const batchExecutions = await this.batchExecutionModel
      .find({ companyId })
      .lean()
      .exec();
    return batchExecutions;
  }

  /**
   * Find the latest batch execution for a company
   * @param companyId The company ID
   * @returns The latest batch execution or null if none exists
   */
  async findLatestByCompanyId(companyId: string): Promise<BatchExecutionDocument | null> {
    this.logger.debug(`Finding latest batch execution for company: ${companyId}`);
    const batchExecution = await this.batchExecutionModel
      .findOne({ companyId })
      .sort({ executedAt: -1 })
      .exec();
    return batchExecution;
  }

  /**
   * Count how many batch executions exist for a company
   * @param companyId The company ID
   * @returns The number of batch executions
   */
  async countByCompanyId(companyId: string): Promise<number> {
    this.logger.debug(`Counting batch executions for company: ${companyId}`);
    return this.batchExecutionModel.countDocuments({ companyId }).exec();
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
   * Delete all batch executions for a company
   * @param companyId The company ID
   * @returns The number of batch executions deleted
   */
  async deleteByCompanyId(companyId: string): Promise<number> {
    this.logger.debug(`Deleting all batch executions for company: ${companyId}`);
    const result = await this.batchExecutionModel.deleteMany({ companyId }).exec();
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
}