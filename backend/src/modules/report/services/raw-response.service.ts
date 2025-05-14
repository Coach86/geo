import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RawResponse, RawResponseDocument } from '../schemas/raw-response.schema';

@Injectable()
export class RawResponseService {
  private readonly logger = new Logger(RawResponseService.name);

  constructor(
    @InjectModel(RawResponse.name) private rawResponseModel: Model<RawResponseDocument>,
  ) {}

  /**
   * Store a raw LLM response in the database
   * @param batchExecutionId The ID of the batch execution this response belongs to
   * @param llmProvider The LLM provider that generated the response
   * @param promptType The type of prompt ('spontaneous', 'direct', or 'comparison')
   * @param promptIndex The index of the prompt within its type
   * @param response The raw response text from the LLM
   * @param options Optional object containing extra metadata (citations, toolUsage, usedWebSearch, responseMetadata)
   * @returns The created raw response record
   */
  async storeRawResponse(
    batchExecutionId: string,
    llmProvider: string,
    promptType: 'spontaneous' | 'direct' | 'comparison',
    promptIndex: number,
    response: string,
    options?: {
      citations?: any[];
      toolUsage?: any[];
      usedWebSearch?: boolean;
      responseMetadata?: any;
    },
  ): Promise<any> {
    try {
      // Process citations to remove duplicates
      let citations = options?.citations || [];
      if (citations.length > 0) {
        // Create a map to track unique URLs
        const uniqueUrls = new Map();
        
        // Filter out duplicate citations with the same URL - simpler approach
        citations = citations.filter(citation => {
          if (!citation.url) return true; // Keep citations without URL
          
          // Use the raw URL as the key for deduplication
          const url = citation.url.trim();
          
          // Keep the citation if we haven't seen this URL before
          if (!uniqueUrls.has(url)) {
            uniqueUrls.set(url, true);
            return true;
          }
          
          // Skip this citation as it's a duplicate 
          this.logger.debug(`Removing duplicate citation: ${url}`);
          return false;
        });
        
        if (citations.length < (options?.citations?.length || 0)) {
          this.logger.log(`Removed ${(options?.citations?.length || 0) - citations.length} duplicate citations`);
        }
      }
      
      // Use the citations array directly
      const citationsArray = citations.length > 0 ? citations : [];

      // Use the tool usage array directly - adapters should already provide standardized tools
      const toolUsageArray = options?.toolUsage || [];

      // Use response metadata directly
      const responseMetadataObj = options?.responseMetadata || null;

      // Log what we're storing
      if (citationsArray.length > 0 && options?.citations) {
        const originalCount = options.citations.length;
        const afterDedupeCount = citations.length;
        
        if (originalCount !== afterDedupeCount) {
          this.logger.log(`Storing ${afterDedupeCount} citations for response (removed ${originalCount - afterDedupeCount} duplicates)`);
        } else {
          this.logger.log(`Storing ${options.citations.length} citations for response (no duplicates found)`);
        }
        
        // Log the first few domains being stored
        if (citations.length > 0) {
          // Simply log the first 3 URLs for visibility
          const urls = citations.slice(0, 3).map(citation => citation.url);
          this.logger.log(`Sample URLs: ${urls.join(', ')}${citations.length > 3 ? '...' : ''}`);
        }
      }

      if (toolUsageArray.length > 0 && options?.toolUsage) {
        this.logger.log(`Storing ${options.toolUsage.length} tool usage records for response`);
      }

      if (options?.usedWebSearch) {
        this.logger.log(`Storing web search indicator for response`);
      }

      // Create a new raw response document
      const newRawResponse = new this.rawResponseModel({
        batchExecutionId,
        llmProvider,
        promptType,
        promptIndex,
        response,
        usedWebSearch: Boolean(options?.usedWebSearch),
        citations: citationsArray,
        toolUsage: toolUsageArray,
        responseMetadata: responseMetadataObj,
      });

      // Save and return the document
      return await newRawResponse.save();
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
        .sort({ promptType: 1, promptIndex: 1, llmProvider: 1 })
        .exec();
      
      return responses;
    } catch (error) {
      this.logger.error(`Failed to get raw responses: ${error.message}`, error.stack);
      throw new Error(`Failed to get raw responses: ${error.message}`);
    }
  }

  /**
   * Get raw responses filtered by batch execution, prompt type, and/or LLM provider
   * @param filters Filter criteria
   * @returns Array of matching raw responses
   */
  async getRawResponses(filters: {
    batchExecutionId?: string;
    llmProvider?: string;
    promptType?: 'spontaneous' | 'direct' | 'comparison';
  }): Promise<any[]> {
    try {
      const responses = await this.rawResponseModel
        .find(filters)
        .sort({ promptType: 1, promptIndex: 1, llmProvider: 1 })
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
