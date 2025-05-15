import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BatchExecutionService } from '../services/batch-execution.service';

@ApiTags('batch-executions')
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
  @ApiOperation({ summary: 'Get batch executions for a company' })
  @ApiQuery({ name: 'companyId', required: true, description: 'The ID of the company' })
  @ApiResponse({
    status: 200,
    description: 'Return batch executions for the company',
  })
  async getBatchExecutionsByCompany(@Query('companyId') companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Company ID is required');
    }

    try {
      return await this.batchExecutionService.getBatchExecutionsByCompany(companyId);
    } catch (error) {
      throw new NotFoundException(`Failed to retrieve batch executions: ${error.message}`);
    }
  }
}
