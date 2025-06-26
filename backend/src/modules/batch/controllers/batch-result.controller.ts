import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BatchResultRepository } from '../repositories/batch-result.repository';
import { BatchExecutionRepository } from '../repositories/batch-execution.repository';

@ApiTags('Admin - Batch Processing')
@Controller('admin/batch-results')
export class BatchResultController {
  constructor(
    private readonly batchResultRepository: BatchResultRepository,
    private readonly batchExecutionRepository: BatchExecutionRepository,
  ) {}

  @Get('execution/:executionId')
  @ApiOperation({ summary: 'Get all batch results for a batch execution' })
  @ApiParam({ name: 'executionId', description: 'The ID of the batch execution' })
  @ApiResponse({ status: 200, description: 'Return all batch results for the execution' })
  @ApiResponse({ status: 404, description: 'Batch execution not found' })
  async getResultsByExecution(@Param('executionId') executionId: string) {
    // Verify execution exists
    const execution = await this.batchExecutionRepository.findByIdLean(executionId);
    if (!execution) {
      throw new NotFoundException(`Batch execution ${executionId} not found`);
    }

    const results = await this.batchResultRepository.findAllByExecutionId(executionId);
    
    return {
      executionId,
      projectId: execution.projectId,
      status: execution.status,
      executedAt: execution.executedAt,
      results: results.map(result => ({
        id: result.id,
        resultType: result.resultType,
        result: result.result,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      })),
    };
  }

  @Get('execution/:executionId/:resultType')
  @ApiOperation({ summary: 'Get a specific type of batch result for a batch execution' })
  @ApiParam({ name: 'executionId', description: 'The ID of the batch execution' })
  @ApiParam({ 
    name: 'resultType', 
    description: 'The type of result',
    enum: ['visibility', 'sentiment', 'competition', 'alignment']
  })
  @ApiResponse({ status: 200, description: 'Return the specific batch result' })
  @ApiResponse({ status: 404, description: 'Batch result not found' })
  async getResultByTypeAndExecution(
    @Param('executionId') executionId: string,
    @Param('resultType') resultType: 'visibility' | 'sentiment' | 'competition' | 'alignment',
  ) {
    const result = await this.batchResultRepository.findByExecutionIdAndTypeLean(
      executionId,
      resultType,
    );

    if (!result) {
      throw new NotFoundException(
        `No ${resultType} result found for batch execution ${executionId}`,
      );
    }

    return {
      id: result.id,
      executionId: result.batchExecutionId,
      resultType: result.resultType,
      result: result.result,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  @Get('project/:projectId/latest')
  @ApiOperation({ summary: 'Get the latest batch results for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiQuery({ 
    name: 'resultType', 
    required: false, 
    description: 'Filter by result type',
    enum: ['visibility', 'sentiment', 'competition', 'alignment']
  })
  @ApiResponse({ status: 200, description: 'Return the latest batch results' })
  async getLatestResultsByProject(
    @Param('projectId') projectId: string,
    @Query('resultType') resultType?: 'visibility' | 'sentiment' | 'competition' | 'alignment',
  ) {
    // Get the latest completed batch execution for this project
    const latestExecution = await this.batchExecutionRepository.findLatestByProjectId(
      projectId,
      'completed',
    );

    if (!latestExecution) {
      throw new NotFoundException(
        `No completed batch executions found for project ${projectId}`,
      );
    }

    if (resultType) {
      // Get specific result type
      const result = await this.batchResultRepository.findByExecutionIdAndTypeLean(
        latestExecution.id,
        resultType,
      );

      if (!result) {
        throw new NotFoundException(
          `No ${resultType} result found for latest batch execution`,
        );
      }

      return {
        executionId: latestExecution.id,
        projectId: latestExecution.projectId,
        executedAt: latestExecution.executedAt,
        result: {
          id: result.id,
          resultType: result.resultType,
          result: result.result,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        },
      };
    } else {
      // Get all results
      const results = await this.batchResultRepository.findAllByExecutionId(latestExecution.id);

      return {
        executionId: latestExecution.id,
        projectId: latestExecution.projectId,
        executedAt: latestExecution.executedAt,
        results: results.map(result => ({
          id: result.id,
          resultType: result.resultType,
          result: result.result,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        })),
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a batch result by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the batch result' })
  @ApiResponse({ status: 200, description: 'Return the batch result' })
  @ApiResponse({ status: 404, description: 'Batch result not found' })
  async getBatchResult(@Param('id') id: string) {
    const result = await this.batchResultRepository.findById(id);

    if (!result) {
      throw new NotFoundException(`Batch result ${id} not found`);
    }

    return {
      id: result.id,
      executionId: result.batchExecutionId,
      resultType: result.resultType,
      result: result.result,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }
}