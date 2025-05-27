import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BatchResult,
  BatchResultDocument,
} from '../schemas/batch-result.schema';
import { PipelineType } from '../interfaces/llm.interfaces';

/**
 * Repository for BatchResult MongoDB documents
 * Handles all direct interactions with the MongoDB model
 */
@Injectable()
export class BatchResultRepository {
  private readonly logger = new Logger(BatchResultRepository.name);

  constructor(
    @InjectModel(BatchResult.name)
    private batchResultModel: Model<BatchResultDocument>,
  ) {}

  /**
   * Create a new batch result
   * @param batchResultData Data to create the batch result with
   * @returns The created batch result document
   */
  async create(batchResultData: Partial<BatchResult>): Promise<BatchResultDocument> {
    this.logger.debug(`Creating new batch result for execution ${batchResultData.batchExecutionId}`);
    const newBatchResult = new this.batchResultModel(batchResultData);
    return newBatchResult.save();
  }

  /**
   * Find a batch result by its ID
   * @param batchResultId The unique ID of the batch result
   * @returns The batch result document or null if not found
   */
  async findById(batchResultId: string): Promise<BatchResultDocument | null> {
    this.logger.debug(`Finding batch result by ID: ${batchResultId}`);
    const batchResult = await this.batchResultModel.findOne({ id: batchResultId }).exec();
    return batchResult;
  }

  /**
   * Find a batch result by type and execution ID
   * @param batchExecutionId The ID of the batch execution
   * @param resultType The type of result
   * @returns The batch result document or null if not found
   */
  async findByExecutionIdAndType(
    batchExecutionId: string,
    resultType: PipelineType | string,
  ): Promise<BatchResultDocument | null> {
    this.logger.debug(`Finding ${resultType} result for batch execution: ${batchExecutionId}`);
    const batchResult = await this.batchResultModel
      .findOne({ batchExecutionId, resultType })
      .exec();
    return batchResult;
  }

  /**
   * Find a batch result by type and execution ID as a lean document
   * @param batchExecutionId The ID of the batch execution
   * @param resultType The type of result
   * @returns The batch result document as a plain object
   */
  async findByExecutionIdAndTypeLean(
    batchExecutionId: string,
    resultType: PipelineType | string,
  ): Promise<Record<string, any> | null> {
    this.logger.debug(`Finding ${resultType} result for batch execution (lean): ${batchExecutionId}`);
    const batchResult = await this.batchResultModel
      .findOne({ batchExecutionId, resultType })
      .lean()
      .exec();
    return batchResult;
  }

  /**
   * Get all batch results for a batch execution
   * @param batchExecutionId The batch execution ID
   * @returns Array of batch results
   */
  async findAllByExecutionId(batchExecutionId: string): Promise<BatchResultDocument[]> {
    this.logger.debug(`Finding all batch results for execution: ${batchExecutionId}`);
    const batchResults = await this.batchResultModel
      .find({ batchExecutionId })
      .exec();
    return batchResults;
  }

  /**
   * Get all batch results for a batch execution as lean objects
   * @param batchExecutionId The batch execution ID
   * @returns Array of plain JavaScript objects
   */
  async findAllByExecutionIdLean(batchExecutionId: string): Promise<any[]> {
    this.logger.debug(`Finding all batch results (lean) for execution: ${batchExecutionId}`);
    const batchResults = await this.batchResultModel
      .find({ batchExecutionId })
      .lean()
      .exec();
    return batchResults;
  }

  /**
   * Check if a batch result exists for a given execution and type
   * @param batchExecutionId The batch execution ID
   * @param resultType The type of result
   * @returns True if exists, false otherwise
   */
  async existsByExecutionIdAndType(
    batchExecutionId: string,
    resultType: PipelineType | string,
  ): Promise<boolean> {
    this.logger.debug(`Checking if ${resultType} result exists for batch execution: ${batchExecutionId}`);
    const count = await this.batchResultModel
      .countDocuments({ batchExecutionId, resultType })
      .exec();
    return count > 0;
  }

  /**
   * Update a batch result by ID
   * @param batchResultId The unique ID of the batch result
   * @param batchResultData The data to update
   * @returns The updated batch result
   */
  async updateById(
    batchResultId: string,
    batchResultData: Partial<BatchResult>,
  ): Promise<BatchResultDocument | null> {
    this.logger.debug(`Updating batch result: ${batchResultId}`);
    return this.batchResultModel
      .findOneAndUpdate({ id: batchResultId }, batchResultData, { new: true })
      .exec();
  }

  /**
   * Update or create a batch result by execution ID and type
   * @param batchExecutionId The batch execution ID
   * @param resultType The type of result
   * @param resultData The result data
   * @returns The updated or created batch result
   */
  async upsertByExecutionIdAndType(
    batchExecutionId: string,
    resultType: PipelineType | string,
    resultData: any,
  ): Promise<BatchResultDocument> {
    this.logger.debug(`Upserting ${resultType} result for batch execution: ${batchExecutionId}`);
    const filter = { batchExecutionId, resultType };
    const update = { result: resultData };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    
    const result = await this.batchResultModel
      .findOneAndUpdate(filter, update, options)
      .exec();
      
    if (!result) {
      throw new NotFoundException(`Failed to upsert batch result for execution ${batchExecutionId} and type ${resultType}`);
    }
    
    return result;
  }

  /**
   * Delete a batch result by ID
   * @param batchResultId The unique ID of the batch result
   * @returns True if deleted, false if not found
   */
  async deleteById(batchResultId: string): Promise<boolean> {
    this.logger.debug(`Deleting batch result: ${batchResultId}`);
    const result = await this.batchResultModel.deleteOne({ id: batchResultId }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Delete all batch results for a batch execution
   * @param batchExecutionId The batch execution ID
   * @returns The number of batch results deleted
   */
  async deleteByExecutionId(batchExecutionId: string): Promise<number> {
    this.logger.debug(`Deleting all batch results for execution: ${batchExecutionId}`);
    const result = await this.batchResultModel.deleteMany({ batchExecutionId }).exec();
    return result.deletedCount;
  }
}