import { Controller, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BatchService } from '../services/batch.service';
import { BatchTask } from '../tasks/batch.task';
import { CompanyBatchOrchestratorService } from '../services/company-batch-orchestrator.service';

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
    private readonly batchOrchestratorService: CompanyBatchOrchestratorService,
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
  
  @Post('orchestrate/:companyId')
  @ApiOperation({ summary: 'Orchestrate all batches for a company and generate report with email notification' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company to process' })
  @ApiResponse({
    status: 200,
    description: 'Company batches orchestrated successfully',
  })
  async orchestrateCompany(@Param('companyId') companyId: string) {
    const result = await this.batchTask.triggerCompanyBatch(companyId);
    return {
      success: true,
      message: `Company ${companyId} batches orchestrated and report generated`,
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

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(companyId, 'spontaneous');

    // Add batch execution ID to context
    const contextWithExecId = { ...companyContext, batchExecutionId: batchExecution.id };

    try {
      // Run pipeline
      const result = await this.batchService.runSpontaneousPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecution.id, 'spontaneous', result);

      // Mark batch execution as completed
      await this.batchService.completeSinglePipelineBatchExecution(batchExecution.id);

      return {
        ...result,
        batchExecutionId: batchExecution.id
      };
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecution.id, error.message);
      throw error;
    }
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

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(companyId, 'sentiment');

    // Add batch execution ID to context
    const contextWithExecId = { ...companyContext, batchExecutionId: batchExecution.id };

    try {
      // Run pipeline
      const result = await this.batchService.runSentimentPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecution.id, 'sentiment', result);

      // Mark batch execution as completed
      await this.batchService.completeSinglePipelineBatchExecution(batchExecution.id);

      return {
        ...result,
        batchExecutionId: batchExecution.id
      };
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecution.id, error.message);
      throw error;
    }
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

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(companyId, 'comparison');

    // Add batch execution ID to context
    const contextWithExecId = { ...companyContext, batchExecutionId: batchExecution.id };

    try {
      // Run pipeline
      const result = await this.batchService.runComparisonPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecution.id, 'comparison', result);

      // Mark batch execution as completed
      await this.batchService.completeSinglePipelineBatchExecution(batchExecution.id);

      return {
        ...result,
        batchExecutionId: batchExecution.id
      };
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecution.id, error.message);
      throw error;
    }
  }
}
