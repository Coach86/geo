import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RawResponse,
  RawResponseDocument,
} from '../schemas/raw-response.schema';

/**
 * Repository for RawResponse MongoDB documents
 * Handles all direct interactions with the MongoDB model
 */
@Injectable()
export class RawResponseRepository {
  private readonly logger = new Logger(RawResponseRepository.name);

  constructor(
    @InjectModel(RawResponse.name)
    private rawResponseModel: Model<RawResponseDocument>,
  ) {}

  /**
   * Create a new raw response
   * @param rawResponseData Data to create the raw response with
   * @returns The created raw response document
   */
  async create(rawResponseData: Partial<RawResponse>): Promise<RawResponseDocument> {
    this.logger.debug(`Creating new raw response for execution ${rawResponseData.batchExecutionId}`);
    const newRawResponse = new this.rawResponseModel(rawResponseData);
    return newRawResponse.save();
  }

  /**
   * Find a raw response by its ID
   * @param rawResponseId The unique ID of the raw response
   * @returns The raw response document or null if not found
   */
  async findById(rawResponseId: string): Promise<RawResponseDocument | null> {
    this.logger.debug(`Finding raw response by ID: ${rawResponseId}`);
    const rawResponse = await this.rawResponseModel.findOne({ id: rawResponseId }).exec();
    return rawResponse;
  }

  /**
   * Find raw responses by batch execution ID
   * @param batchExecutionId The batch execution ID
   * @returns Array of raw responses
   */
  async findByExecutionId(batchExecutionId: string): Promise<RawResponseDocument[]> {
    this.logger.debug(`Finding raw responses for batch execution: ${batchExecutionId}`);
    const rawResponses = await this.rawResponseModel
      .find({ batchExecutionId })
      .exec();
    return rawResponses;
  }

  /**
   * Find raw responses by batch execution ID and prompt type
   * @param batchExecutionId The batch execution ID
   * @param promptType The type of prompt
   * @returns Array of raw responses
   */
  async findByExecutionIdAndPromptType(
    batchExecutionId: string,
    promptType: string,
  ): Promise<RawResponseDocument[]> {
    this.logger.debug(`Finding ${promptType} raw responses for batch execution: ${batchExecutionId}`);
    const rawResponses = await this.rawResponseModel
      .find({ batchExecutionId, promptType })
      .exec();
    return rawResponses;
  }

  /**
   * Find raw response by batch execution ID, prompt type, and index
   * @param batchExecutionId The batch execution ID
   * @param promptType The type of prompt
   * @param promptIndex The index of the prompt
   * @returns The raw response document or null if not found
   */
  async findByExecutionIdPromptTypeAndIndex(
    batchExecutionId: string,
    promptType: string,
    promptIndex: number,
  ): Promise<RawResponseDocument | null> {
    this.logger.debug(
      `Finding raw response for batch execution: ${batchExecutionId}, prompt type: ${promptType}, index: ${promptIndex}`,
    );
    const rawResponse = await this.rawResponseModel
      .findOne({ batchExecutionId, promptType, promptIndex })
      .exec();
    return rawResponse;
  }

  /**
   * Update a raw response by ID
   * @param rawResponseId The unique ID of the raw response
   * @param rawResponseData The data to update
   * @returns The updated raw response
   */
  async updateById(
    rawResponseId: string,
    rawResponseData: Partial<RawResponse>,
  ): Promise<RawResponseDocument | null> {
    this.logger.debug(`Updating raw response: ${rawResponseId}`);
    return this.rawResponseModel
      .findOneAndUpdate({ id: rawResponseId }, rawResponseData, { new: true })
      .exec();
  }

  /**
   * Update a raw response's analyzer data
   * @param rawResponseId The unique ID of the raw response
   * @param analyzerPrompt The analyzer prompt
   * @param analyzerResponse The analyzer response
   * @param analyzerResponseModel The analyzer model
   * @returns The updated raw response
   */
  async updateAnalyzerData(
    rawResponseId: string,
    analyzerPrompt: string,
    analyzerResponse: any,
    analyzerResponseModel: string,
  ): Promise<RawResponseDocument | null> {
    this.logger.debug(`Updating analyzer data for raw response: ${rawResponseId}`);
    return this.rawResponseModel
      .findOneAndUpdate(
        { id: rawResponseId },
        {
          analyzerPrompt,
          analyzerResponse,
          analyzerResponseModel,
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Delete a raw response by ID
   * @param rawResponseId The unique ID of the raw response
   * @returns True if deleted, false if not found
   */
  async deleteById(rawResponseId: string): Promise<boolean> {
    this.logger.debug(`Deleting raw response: ${rawResponseId}`);
    const result = await this.rawResponseModel.deleteOne({ id: rawResponseId }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Delete all raw responses for a batch execution
   * @param batchExecutionId The batch execution ID
   * @returns The number of raw responses deleted
   */
  async deleteByExecutionId(batchExecutionId: string): Promise<number> {
    this.logger.debug(`Deleting all raw responses for execution: ${batchExecutionId}`);
    const result = await this.rawResponseModel.deleteMany({ batchExecutionId }).exec();
    return result.deletedCount;
  }
}