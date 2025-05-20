import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RawResponse, RawResponseDocument } from '../schemas/raw-response.schema';
import { PromptType } from '../interfaces/llm.interfaces';

@Injectable()
export class RawResponseService {
  private readonly logger = new Logger(RawResponseService.name);

  constructor(
    @InjectModel(RawResponse.name) private rawResponseModel: Model<RawResponseDocument>,
  ) {}

  /**
   * Store a raw LLM response in the database
   * @param batchExecutionId The ID of the batch execution this response belongs to
   * @param promptType The type of prompt ('spontaneous', 'direct', 'comparison', or 'accuracy')
   * @param promptIndex The index of the prompt within its type
   * @param originalPrompt The original prompt sent to the LLM
   * @param llmResponse The raw response text from the LLM
   * @param llmResponseModel The model used to generate the LLM response
   * @param analyzerPrompt The prompt sent to the analyzer (optional)
   * @param analyzerResponse The structured response from the analyzer (optional)
   * @param analyzerResponseModel The model used to generate the analyzer response (optional)
   * @returns The created raw response record
   */
  async storeRawResponse(
    batchExecutionId: string,
    promptType: PromptType,
    promptIndex: number,
    originalPrompt: string,
    llmResponse: string,
    llmResponseModel: string,
    analyzerPrompt?: string,
    analyzerResponse?: any,
    analyzerResponseModel?: string,
    modelIdentifier?: string, // Add model identifier for uniqueness
  ): Promise<any> {
    try {
      this.logger.log(
        `Storing raw response for ${promptType} prompt #${promptIndex} in batch execution ${batchExecutionId}`,
      );

      // First, check if a document already exists with these keys
      const query: any = {
        batchExecutionId,
        promptType,
        promptIndex,
      };

      // Add model identifier to the query if provided for uniqueness
      if (modelIdentifier) {
        query.llmResponseModel = modelIdentifier;
      }

      const existingResponse = await this.rawResponseModel.findOne(query).lean().exec();

      if (existingResponse) {
        // Update the existing document with analyzer information if provided
        if (analyzerPrompt !== undefined) {
          existingResponse.analyzerPrompt = analyzerPrompt;
        }
        if (analyzerResponse !== undefined) {
          existingResponse.analyzerResponse = analyzerResponse;
        }
        if (analyzerResponseModel !== undefined) {
          existingResponse.analyzerResponseModel = analyzerResponseModel;
        }

        // Save and return the updated document
        this.logger.log(
          `Updating existing raw response with analyzer data for ${promptType} prompt #${promptIndex} in batch execution ${batchExecutionId}`,
        );
        return await existingResponse.save();
      } else {
        // Create a new raw response document
        const newRawResponse = new this.rawResponseModel({
          batchExecutionId,
          promptType,
          promptIndex,
          originalPrompt,
          llmResponse,
          llmResponseModel,
          analyzerPrompt,
          analyzerResponse,
          analyzerResponseModel,
        });

        // Save and return the document
        return await newRawResponse.save();
      }
    } catch (error) {
      this.logger.error(`Failed to store raw response: ${error.message}`, error.stack);
      throw new Error(`Failed to store raw response: ${error.message}`);
    }
  }

  /**
   * Get all raw responses for a specific batch execution
   * @param batchExecutionId The ID of the batch execution
   * @returns Array of raw responses
   */
  async getRawResponsesByBatchExecution(batchExecutionId: string): Promise<any[]> {
    try {
      const responses = await this.rawResponseModel
        .find({ batchExecutionId })
        .sort({ promptType: 1, promptIndex: 1 })
        .lean()
        .exec();

      return responses;
    } catch (error) {
      this.logger.error(`Failed to get raw responses: ${error.message}`, error.stack);
      throw new Error(`Failed to get raw responses: ${error.message}`);
    }
  }

  /**
   * Get raw responses filtered by batch execution and prompt type
   * @param filters Filter criteria
   * @returns Array of matching raw responses
   */
  async getRawResponses(filters: {
    batchExecutionId?: string;
    promptType?: 'spontaneous' | 'direct' | 'comparison' | 'accuracy';
  }): Promise<any[]> {
    try {
      const responses = await this.rawResponseModel
        .find(filters)
        .sort({ promptType: 1, promptIndex: 1 })
        .lean()
        .exec();

      return responses;
    } catch (error) {
      this.logger.error(`Failed to get raw responses: ${error.message}`, error.stack);
      throw new Error(`Failed to get raw responses: ${error.message}`);
    }
  }

  /**
   * Delete all raw responses for a specific batch execution
   * @param batchExecutionId The ID of the batch execution
   * @returns The number of records deleted
   */
  async deleteRawResponsesByBatchExecution(batchExecutionId: string): Promise<number> {
    try {
      const result = await this.rawResponseModel.deleteMany({ batchExecutionId }).exec();
      return result.deletedCount || 0;
    } catch (error) {
      this.logger.error(`Failed to delete raw responses: ${error.message}`, error.stack);
      throw new Error(`Failed to delete raw responses: ${error.message}`);
    }
  }
}
