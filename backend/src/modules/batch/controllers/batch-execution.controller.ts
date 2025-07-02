import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BatchExecutionService } from '../services/batch-execution.service';

@ApiTags('Admin - Batch Processing')
@Controller('admin/batch-executions')
export class BatchExecutionController {
  constructor(private readonly batchExecutionService: BatchExecutionService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a batch execution by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the batch execution' })
  @ApiResponse({ status: 200, description: 'Return the batch execution with results' })
  @ApiResponse({ status: 404, description: 'Batch execution not found' })
  async getBatchExecution(@Param('id') id: string) {
    try {
      return await this.batchExecutionService.getBatchExecution(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Failed to retrieve batch execution: ${error.message}`);
    }
  }

  @Get(':id/raw-responses')
  @ApiOperation({ summary: 'Get raw responses for a batch execution' })
  @ApiParam({ name: 'id', description: 'The ID of the batch execution' })
  @ApiResponse({ status: 200, description: 'Return the raw responses for the batch execution' })
  @ApiResponse({ status: 404, description: 'Batch execution not found' })
  async getRawResponses(@Param('id') id: string) {
    try {
      return await this.batchExecutionService.getRawResponses(id);
    } catch (error) {
      throw new NotFoundException(`Failed to retrieve raw responses: ${error.message}`);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get batch executions for a project' })
  @ApiQuery({ name: 'projectId', required: true, description: 'The ID of the project' })
  @ApiResponse({
    status: 200,
    description: 'Return batch executions for the project',
  })
  async getBatchExecutionsByProject(@Query('projectId') projectId: string) {
    if (!projectId) {
      throw new NotFoundException('Project ID is required');
    }

    try {
      return await this.batchExecutionService.getBatchExecutionsByProject(projectId);
    } catch (error) {
      throw new NotFoundException(`Failed to retrieve batch executions: ${error.message}`);
    }
  }

  @Get('statistics/by-day')
  @ApiOperation({ summary: 'Get batch execution statistics by day' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Return batch execution statistics grouped by day and trigger source',
  })
  async getBatchStatisticsByDay(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      
      return await this.batchExecutionService.getBatchStatisticsByDay(start, end);
    } catch (error) {
      throw new NotFoundException(`Failed to retrieve batch statistics: ${error.message}`);
    }
  }
}
