import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery, ApiParam } from '@nestjs/swagger';
import { RawResponseService } from '../services/raw-response.service';
import { RawResponseDto } from '../dto/raw-response.dto';
import { PromptType } from '../interfaces/llm.interfaces';
@ApiTags('raw-responses')
@Controller('admin/raw-responses')
export class RawResponseController {
  constructor(private readonly rawResponseService: RawResponseService) {}

  @Get('batch-execution/:batchExecutionId')
  @ApiOperation({ summary: 'Get all raw LLM responses for a specific batch execution' })
  @ApiParam({ name: 'batchExecutionId', description: 'The ID of the batch execution' })
  @ApiResponse({
    status: 200,
    description: 'Returns all raw LLM responses for the specified batch execution',
    type: [RawResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Batch execution not found' })
  async getRawResponsesByBatchExecution(@Param('batchExecutionId') batchExecutionId: string) {
    try {
      const responses =
        await this.rawResponseService.getRawResponsesByBatchExecution(batchExecutionId);
      if (responses.length === 0) {
        throw new NotFoundException(
          `No raw responses found for batch execution ID ${batchExecutionId}`,
        );
      }
      return responses;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Failed to retrieve raw responses: ${error.message}`);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get filtered raw LLM responses' })
  @ApiQuery({
    name: 'batchExecutionId',
    required: false,
    description: 'Filter by batch execution ID',
  })
  @ApiQuery({
    name: 'promptType',
    required: false,
    description: 'Filter by prompt type (visibility, sentiment, competition, alignment)',
    enum: ['visibility', 'sentiment', 'competition', 'alignment'],
  })
  @ApiResponse({
    status: 200,
    description: 'Returns raw LLM responses matching the filter criteria',
    type: [RawResponseDto],
  })
  async getRawResponses(
    @Query('batchExecutionId') batchExecutionId?: string,
    @Query('promptType') promptType?: PromptType,
  ) {
    const filters: any = {};

    if (batchExecutionId) filters.batchExecutionId = batchExecutionId;
    if (promptType) filters.promptType = promptType;

    const responses = await this.rawResponseService.getRawResponses(filters);

    if (responses.length === 0) {
      throw new NotFoundException('No raw responses found matching the criteria');
    }

    return responses;
  }
}
