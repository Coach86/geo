import { Injectable, Logger } from '@nestjs/common';
import { PromptType } from '../interfaces/llm.interfaces';
import { RawResponseRepository } from '../repositories/raw-response.repository';

@Injectable()
export class RawResponseService {
  private readonly logger = new Logger(RawResponseService.name);

  constructor(
    private readonly rawResponseRepository: RawResponseRepository,
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

      // Build response data object
      const responseData = {
        batchExecutionId,
        promptType,
        promptIndex,
        originalPrompt,
        llmResponse,
        llmResponseModel,
        analyzerPrompt,
        analyzerResponse,
        analyzerResponseModel,
      };

      // Find and update or create new if not exists
      const query = {
        batchExecutionId,
        promptType,
        promptIndex,
      };

      // Add model identifier to the query if provided for uniqueness
      if (modelIdentifier) {
        // Using type assertion to avoid TypeScript error
        (query as any)['llmResponseModel'] = modelIdentifier;
      }

      // Check if response already exists
      const existingResponse = await this.rawResponseRepository.findByQuery(query);

      if (existingResponse) {
        // Update existing response with analyzer data if provided
        const updateData: any = {};
        
        if (analyzerPrompt !== undefined) {
          updateData.analyzerPrompt = analyzerPrompt;
        }
        if (analyzerResponse !== undefined) {
          updateData.analyzerResponse = analyzerResponse;
        }
        if (analyzerResponseModel !== undefined) {
          updateData.analyzerResponseModel = analyzerResponseModel;
        }

        this.logger.log(
          `Updating existing raw response with analyzer data for ${promptType} prompt #${promptIndex} in batch execution ${batchExecutionId}`,
        );
        
        return await this.rawResponseRepository.updateById(existingResponse.id, updateData);
      } else {
        // Create a new raw response
        return await this.rawResponseRepository.create(responseData);
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
      return await this.rawResponseRepository.findByExecutionId(batchExecutionId);
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
      return await this.rawResponseRepository.findByFilters(filters);
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
      return await this.rawResponseRepository.deleteByExecutionId(batchExecutionId);
    } catch (error) {
      this.logger.error(`Failed to delete raw responses: ${error.message}`, error.stack);
      throw new Error(`Failed to delete raw responses: ${error.message}`);
    }
  }
}
