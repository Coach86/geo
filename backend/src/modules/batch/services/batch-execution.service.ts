import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BatchExecutionRepository } from '../repositories/batch-execution.repository';
import { BatchResultRepository } from '../repositories/batch-result.repository';
import { RawResponseRepository } from '../repositories/raw-response.repository';
import { ProjectRepository } from '../../project/repositories/project.repository';

@Injectable()
export class BatchExecutionService {
  private readonly logger = new Logger(BatchExecutionService.name);

  constructor(
    private readonly batchExecutionRepository: BatchExecutionRepository,
    private readonly batchResultRepository: BatchResultRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly rawResponseRepository: RawResponseRepository,
  ) {}

  /**
   * Create a new batch execution
   * @param projectId The ID of the project
   * @returns The created batch execution
   */
  async createBatchExecution(projectId: string): Promise<any> {
    try {
      // Verify the project exists
      const project = await this.projectRepository.findById(projectId);

      if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }

      // Create a new batch execution
      const batchExecution = await this.batchExecutionRepository.create({
        projectId,
        status: 'running',
        executedAt: new Date(),
      });

      this.logger.log(`Created batch execution ${batchExecution.id} for project ${projectId}`);
      return batchExecution;
    } catch (error) {
      this.logger.error(`Failed to create batch execution: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Save a batch result
   * @param batchExecutionId The ID of the batch execution
   * @param resultType The type of result ('visibility', 'sentiment', 'competition', 'alignment')
   * @param result The result to save
   * @returns The created batch result
   */
  async saveBatchResult(
    batchExecutionId: string,
    resultType: 'visibility' | 'sentiment' | 'competition' | 'alignment',
    result: any,
  ): Promise<any> {
    try {
      // Find the batch execution
      const batchExecution = await this.batchExecutionRepository.findByIdLean(batchExecutionId);

      if (!batchExecution) {
        throw new NotFoundException(`Batch execution ${batchExecutionId} not found`);
      }

      // Extract web search queries for each individual result item (no top level)
      const enhancedResult = this.addWebSearchQueriesToResults(result);

      // Save the batch result
      const batchResult = await this.batchResultRepository.create({
        batchExecutionId,
        resultType,
        result: enhancedResult, // Store the enhanced object directly
      });

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
    // Log what we're about to clone
    this.logger.log(`[BATCH-001] About to clone result with ${result?.results?.length || 0} results`);
    if (result?.results?.length > 0) {
      this.logger.log(`[BATCH-002] First result before clone: ${JSON.stringify({
        model: result.results[0].llmModel,
        hasLlmResponse: !!result.results[0].llmResponse,
        llmResponseLength: result.results[0].llmResponse?.length || 0
      })}`);
    }
    
    // Deep clone the result to avoid modifying the original object
    const enhancedResult = JSON.parse(JSON.stringify(result));
    
    // Verify the clone
    if (enhancedResult?.results?.length > 0) {
      this.logger.log(`[BATCH-003] First result after clone: ${JSON.stringify({
        model: enhancedResult.results[0].llmModel,
        hasLlmResponse: !!enhancedResult.results[0].llmResponse,
        llmResponseLength: enhancedResult.results[0].llmResponse?.length || 0
      })}`);
    }

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
            
            // Log what we found for debugging
            if (webSearchTools.length > 0) {
              this.logger.debug(
                `Found ${webSearchTools.length} web search tools for ${resultItem.llmProvider}: ${JSON.stringify(webSearchTools[0])}`,
              );
            }

            // Store the web search queries directly in the result item only
            resultItem.webSearchQueries = webSearchTools.map((tool: any) => ({
              // Check multiple locations for the query
              query: tool.input?.query || // Google format
                     tool.parameters?.query || // Other formats
                     tool.parameters?.q || 
                     tool.query || // Direct query field
                     'Unknown query',
              status: tool.execution?.status || 
                      tool.execution_details?.status || 
                      'completed',
              timestamp: tool.execution?.timestamp || 
                         tool.execution_details?.timestamp || 
                         new Date().toISOString(),
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
      
      const batchExecution = await this.batchExecutionRepository.updateById(batchExecutionId, updateObj);

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
      // This method will need to be added to the repository
      const stalledBatches = await this.batchExecutionRepository.findStalledExecutions(cutoffDate);
        
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
      const batchExecution = await this.batchExecutionRepository.findByIdLean(batchExecutionId);

      if (!batchExecution) {
        throw new NotFoundException(`Batch execution ${batchExecutionId} not found`);
      }

      // Get the associated results
      const batchResults = await this.batchResultRepository.findAllByExecutionId(batchExecutionId);

      // Get the project details
      const project = await this.projectRepository.findById(batchExecution.projectId);

      return {
        ...batchExecution,  // Using lean() so it's already a plain object
        finalResults: batchResults,
        project: project,
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
      const rawResponses = await this.rawResponseRepository.findByExecutionId(batchExecutionId);

      return rawResponses;
    } catch (error) {
      this.logger.error(`Failed to get raw responses: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all batch executions for a project
   * @param projectId The ID of the project
   * @returns The batch executions for the project
   */
  async getBatchExecutionsByProject(projectId: string): Promise<any[]> {
    try {
      // Get all batch executions for this project
      const batchExecutions = await this.batchExecutionRepository.findByProjectId(projectId);

      // Get all batch execution IDs
      const batchExecutionIds = batchExecutions.map((be: { id: string }) => be.id);

      // We'll need a method to find batch results by multiple execution IDs
      // For now, we'll collect results for each execution individually
      const batchResults = [];
      for (const execId of batchExecutionIds) {
        const results = await this.batchResultRepository.findAllByExecutionId(execId);
        batchResults.push(...results);
      }

      // Group batch results by execution ID
      const resultsMap: Record<string, any[]> = batchResults.reduce(
        (map: Record<string, any[]>, result: any) => {
          if (!map[result.batchExecutionId]) {
            map[result.batchExecutionId] = [];
          }
          map[result.batchExecutionId].push(result);
          return map;
        },
        {},
      );

      // Combine the data
      return batchExecutions.map((execution: any) => ({
        ...execution,  // Using lean() so it's already a plain object
        finalResults: resultsMap[execution.id] || [],
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get batch executions for project: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
