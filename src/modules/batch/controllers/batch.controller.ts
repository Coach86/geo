import { Controller, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BatchService } from '../services/batch.service';
import { BatchTask } from '../tasks/batch.task';

class BatchRunDto {
  @IsString()
  @IsOptional()
  companyId?: string;
}

@ApiTags('batch')
@Controller('batch')
export class BatchController {
  constructor(
    private readonly batchService: BatchService,
    private readonly batchTask: BatchTask,
  ) {}

  @Post('run')
  @ApiOperation({ summary: 'Manually trigger batch processing' })
  @ApiResponse({
    status: 200,
    description: 'Batch processing completed successfully',
  })
  async runBatch(@Body() batchRunDto: BatchRunDto) {
    if (batchRunDto.companyId) {
      // If company ID is provided, run batch for only that company
      const result = await this.batchService.processCompany(batchRunDto.companyId);
      return {
        success: true,
        message: 'Batch processing completed for specific company',
        result,
      };
    } else {
      // Otherwise run the full batch
      const result = await this.batchTask.triggerManualBatch();
      return result;
    }
  }

  @Post('process/:companyId')
  @ApiOperation({ summary: 'Process a specific company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company to process' })
  @ApiResponse({
    status: 200,
    description: 'Company processed successfully',
  })
  async processCompany(@Param('companyId') companyId: string) {
    const result = await this.batchService.processCompany(companyId);
    return {
      success: true,
      message: `Company ${companyId} processed`,
      result,
    };
  }

  @Post('pipeline/spontaneous/:companyId')
  @ApiOperation({ summary: 'Run spontaneous mentions pipeline for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({
    status: 200,
    description: 'Spontaneous mentions pipeline completed',
  })
  async runSpontaneousPipeline(@Param('companyId') companyId: string) {
    // Get company data
    const companyContext = await this.batchService.getCompanyBatchContext(companyId);
    if (!companyContext) {
      throw new NotFoundException(`Company context not found for ID: ${companyId}`);
    }

    // Run pipeline
    const result = await this.batchService.runSpontaneousPipeline(companyContext);
    return result;
  }

  @Post('pipeline/sentiment/:companyId')
  @ApiOperation({ summary: 'Run sentiment analysis pipeline for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({
    status: 200,
    description: 'Sentiment analysis pipeline completed',
  })
  async runSentimentPipeline(@Param('companyId') companyId: string) {
    // Get company data
    const companyContext = await this.batchService.getCompanyBatchContext(companyId);
    if (!companyContext) {
      throw new NotFoundException(`Company context not found for ID: ${companyId}`);
    }

    // Run pipeline
    const result = await this.batchService.runSentimentPipeline(companyContext);
    return result;
  }

  @Post('pipeline/comparison/:companyId')
  @ApiOperation({ summary: 'Run comparison pipeline for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({
    status: 200,
    description: 'Comparison pipeline completed',
  })
  async runComparisonPipeline(@Param('companyId') companyId: string) {
    // Get company data
    const companyContext = await this.batchService.getCompanyBatchContext(companyId);
    if (!companyContext) {
      throw new NotFoundException(`Company context not found for ID: ${companyId}`);
    }

    // Run pipeline
    const result = await this.batchService.runComparisonPipeline(companyContext);
    return result;
  }
}
