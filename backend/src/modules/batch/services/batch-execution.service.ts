import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BatchExecution, BatchExecutionDocument } from '../schemas/batch-execution.schema';
import { BatchResult, BatchResultDocument } from '../schemas/batch-result.schema';
import {
  IdentityCard,
  IdentityCardDocument,
} from '../../identity-card/schemas/identity-card.schema';
import { RawResponse, RawResponseDocument } from '../schemas/raw-response.schema';

@Injectable()
export class BatchExecutionService {
  private readonly logger = new Logger(BatchExecutionService.name);

  constructor(
    @InjectModel(BatchExecution.name) private batchExecutionModel: Model<BatchExecutionDocument>,
    @InjectModel(BatchResult.name) private batchResultModel: Model<BatchResultDocument>,
    @InjectModel(IdentityCard.name) private identityCardModel: Model<IdentityCardDocument>,
    @InjectModel(RawResponse.name) private rawResponseModel: Model<RawResponseDocument>,
  ) {}

  /**
   * Create a new batch execution
   * @param companyId The ID of the company
   * @returns The created batch execution
   */
  async createBatchExecution(companyId: string): Promise<any> {
    try {
      // Verify the company exists
      const company = await this.identityCardModel.findOne({ id: companyId }).lean().exec();

      if (!company) {
        throw new NotFoundException(`Company with ID ${companyId} not found`);
      }

      // Create a new batch execution
      const newBatchExecution = new this.batchExecutionModel({
        companyId,
        status: 'running',
        executedAt: new Date(),
      });

      const batchExecution = await newBatchExecution.save();

      this.logger.log(`Created batch execution ${batchExecution.id} for company ${companyId}`);
      return batchExecution;
    } catch (error) {
      this.logger.error(`Failed to create batch execution: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Save a batch result
   * @param batchExecutionId The ID of the batch execution
   * @param resultType The type of result ('spontaneous', 'sentiment', 'comparison', 'accuracy')
   * @param result The result to save
   * @returns The created batch result
   */
  async saveBatchResult(
    batchExecutionId: string,
    resultType: 'spontaneous' | 'sentiment' | 'comparison' | 'accuracy',
    result: any,
  ): Promise<any> {
    try {
      // Find the batch execution
      const batchExecution = await this.batchExecutionModel
        .findOne({ id: batchExecutionId })
        .lean()
        .exec();

      if (!batchExecution) {
        throw new NotFoundException(`Batch execution ${batchExecutionId} not found`);
      }

      // Extract web search queries for each individual result item (no top level)
      const enhancedResult = this.addWebSearchQueriesToResults(result);

      // Save the batch result
      const newBatchResult = new this.batchResultModel({
        batchExecutionId,
        resultType,
        result: enhancedResult, // Store the enhanced object directly
      });

      const batchResult = await newBatchResult.save();

      this.logger.log(`Saved ${resultType} result for batch execution ${batchExecutionId}`);

      return batchResult;
    } catch (error) {
      this.logger.error(`Failed to save batch result: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add web search queries to individual result items only
   * @param result The pipeline result to process
   * @returns The enhanced result with web search queries for each result item
   */
  private addWebSearchQueriesToResults(result: any): any {
    // Clone the result to avoid modifying the original object
    const enhancedResult = { ...result };

    try {
      // Check if results array exists
      if (Array.isArray(enhancedResult.results)) {
        // Process each result item
        enhancedResult.results.forEach((resultItem: any) => {
          if (resultItem.toolUsage) {
            // Get the tool usage data
            const toolUsageData = Array.isArray(resultItem.toolUsage)
              ? resultItem.toolUsage
              : typeof resultItem.toolUsage === 'string'
                ? JSON.parse(resultItem.toolUsage)
                : [];

            // Extract web search queries
            const webSearchTools = toolUsageData.filter(
              (tool: any) =>
                tool.type === 'web_search' ||
                tool.type === 'search' ||
                tool.type?.includes('search'),
            );

            // Store the web search queries directly in the result item only
            resultItem.webSearchQueries = webSearchTools.map((tool: any) => ({
              query: tool.parameters?.query || tool.parameters?.q || 'Unknown query',
              status: tool.execution_details?.status || 'Unknown status',
              timestamp: tool.execution_details?.timestamp || new Date().toISOString(),
              provider: resultItem.llmProvider || 'Unknown',
            }));
          }
        });
      }

      this.logger.log('Successfully added web search queries to individual results');
      return enhancedResult;
    } catch (error) {
      this.logger.error(
        `Failed to add web search queries to results: ${error.message}`,
        error.stack,
      );
      // Return the original result if extraction fails
      return result;
    }
  }

  /**
   * Update the status of a batch execution
   * @param batchExecutionId The ID of the batch execution
   * @param status The new status ('running', 'completed', 'failed')
   * @param errorMessage Optional error message when status is 'failed'
   * @returns The updated batch execution
   */
  async updateBatchExecutionStatus(
    batchExecutionId: string,
    status: 'running' | 'completed' | 'failed',
    errorMessage?: string,
  ): Promise<any> {
    try {
      // Prepare update object
      const updateObj: any = { status };
      
      // Add error message if provided and status is failed
      if (status === 'failed' && errorMessage) {
        updateObj.errorMessage = errorMessage;
      }
      
      const batchExecution = await this.batchExecutionModel
        .findOneAndUpdate(
          { id: batchExecutionId },
          updateObj,
          { new: true }, // Return the updated document
        )
        .lean()
        .exec();

      if (!batchExecution) {
        throw new NotFoundException(`Batch execution ${batchExecutionId} not found`);
      }

      if (errorMessage) {
        this.logger.log(`Updated batch execution ${batchExecutionId} status to ${status} with error: ${errorMessage}`);
      } else {
        this.logger.log(`Updated batch execution ${batchExecutionId} status to ${status}`);
      }

      return batchExecution;
    } catch (error) {
      this.logger.error(`Failed to update batch execution status: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Find stalled batch executions
   * @param cutoffDate Date threshold for stalled batches (usually 2 hours ago)
   * @returns Array of stalled batch executions
   */
  async findStalledBatchExecutions(cutoffDate: Date): Promise<any[]> {
    try {
      const stalledBatches = await this.batchExecutionModel
        .find({
          status: 'running',
          createdAt: { $lt: cutoffDate }
        })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
        
      return stalledBatches;
    } catch (error) {
      this.logger.error(`Failed to find stalled batch executions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get a batch execution by ID with all its results
   * @param batchExecutionId The ID of the batch execution
   * @returns The batch execution with results
   */
  async getBatchExecution(batchExecutionId: string): Promise<any> {
    try {
      // Get the batch execution
      const batchExecution = await this.batchExecutionModel
        .findOne({ id: batchExecutionId })
        .lean()
        .exec();

      if (!batchExecution) {
        throw new NotFoundException(`Batch execution ${batchExecutionId} not found`);
      }

      // Get the associated results
      const batchResults = await this.batchResultModel.find({ batchExecutionId }).lean().exec();

      // Get the company details
      const identityCard = await this.identityCardModel
        .findOne({ id: batchExecution.companyId })
        .lean()
        .exec();

      return {
        ...batchExecution,  // Using lean() so it's already a plain object
        finalResults: batchResults,
        identityCard: identityCard,
      };
    } catch (error) {
      this.logger.error(`Failed to get batch execution: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get raw responses for a batch execution
   * @param batchExecutionId The ID of the batch execution
   * @returns The raw responses for the batch execution
   */
  async getRawResponses(batchExecutionId: string): Promise<any[]> {
    try {
      const rawResponses = await this.rawResponseModel
        .find({ batchExecutionId })
        .sort({ promptType: 1, promptIndex: 1, llmProvider: 1 })
        .lean()
        .exec();

      return rawResponses;
    } catch (error) {
      this.logger.error(`Failed to get raw responses: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all batch executions for a company
   * @param companyId The ID of the company
   * @returns The batch executions for the company
   */
  async getBatchExecutionsByCompany(companyId: string): Promise<any[]> {
    try {
      // Get all batch executions for this company
      const batchExecutions = await this.batchExecutionModel
        .find({ companyId })
        .sort({ executedAt: -1 })
        .lean()
        .exec();

      // Get all batch execution IDs
      const batchExecutionIds = batchExecutions.map((be) => be.id);

      // Get all batch results for these executions
      const batchResults = await this.batchResultModel
        .find({ batchExecutionId: { $in: batchExecutionIds } })
        .lean()
        .exec();

      // Group batch results by execution ID
      const resultsMap: Record<string, any[]> = batchResults.reduce(
        (map: Record<string, any[]>, result) => {
          if (!map[result.batchExecutionId]) {
            map[result.batchExecutionId] = [];
          }
          map[result.batchExecutionId].push(result);
          return map;
        },
        {},
      );

      // Combine the data
      return batchExecutions.map((execution) => ({
        ...execution,  // Using lean() so it's already a plain object
        finalResults: resultsMap[execution.id] || [],
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get batch executions for company: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
