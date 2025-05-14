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
    status: 202,
    description: 'Company batch processing started successfully',
  })
  async processCompany(@Param('companyId') companyId: string) {
    // Create a new batch execution record first
    const batchExecution = await this.batchService.createBatchExecution(companyId);
    
    // Start the batch processing in the background (don't await)
    this.batchService.processCompany(companyId, batchExecution.id)
      .then(result => {
        this.batchService.completeBatchExecution(batchExecution.id, result);
      })
      .catch(error => {
        this.batchService.failBatchExecution(batchExecution.id, error.message || 'Unknown error');
      });
    
    // Return immediately with the batch execution ID
    return {
      success: true,
      message: `Batch processing for company ${companyId} started`,
      batchExecutionId: batchExecution.id,
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
    status: 202,
    description: 'Spontaneous mentions pipeline started',
  })
  async runSpontaneousPipeline(@Param('companyId') companyId: string) {
    // Get company data
    const companyContext = await this.batchService.getCompanyBatchContext(companyId);
    if (!companyContext) {
      throw new NotFoundException(`Company context not found for ID: ${companyId}`);
    }

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(companyId, 'spontaneous');
    const batchExecutionId = batchExecution.id;

    // Process in background
    this.processSpontaneousPipeline(companyContext, batchExecutionId);
    
    // Return immediately with the batch execution ID
    return {
      success: true,
      message: `Spontaneous pipeline for company ${companyId} started`,
      batchExecutionId,
    };
  }
  
  // Background processing method for spontaneous pipeline
  private async processSpontaneousPipeline(companyContext: any, batchExecutionId: string) {
    // Add batch execution ID to context
    const contextWithExecId = { ...companyContext, batchExecutionId };

    try {
      // Run pipeline
      const result = await this.batchService.runSpontaneousPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecutionId, 'spontaneous', result);

      // Mark batch execution as completed
      await this.batchService.completeSinglePipelineBatchExecution(batchExecutionId);
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecutionId, error.message);
    }
  }

  @Post('pipeline/sentiment/:companyId')
  @ApiOperation({ summary: 'Run sentiment analysis pipeline for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({
    status: 202,
    description: 'Sentiment analysis pipeline started',
  })
  async runSentimentPipeline(@Param('companyId') companyId: string) {
    // Get company data
    const companyContext = await this.batchService.getCompanyBatchContext(companyId);
    if (!companyContext) {
      throw new NotFoundException(`Company context not found for ID: ${companyId}`);
    }

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(companyId, 'sentiment');
    const batchExecutionId = batchExecution.id;

    // Process in background
    this.processSentimentPipeline(companyContext, batchExecutionId);
    
    // Return immediately with the batch execution ID
    return {
      success: true,
      message: `Sentiment pipeline for company ${companyId} started`,
      batchExecutionId,
    };
  }
  
  // Background processing method for sentiment pipeline
  private async processSentimentPipeline(companyContext: any, batchExecutionId: string) {
    // Add batch execution ID to context
    const contextWithExecId = { ...companyContext, batchExecutionId };

    try {
      // Run pipeline
      const result = await this.batchService.runSentimentPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecutionId, 'sentiment', result);

      // Mark batch execution as completed
      await this.batchService.completeSinglePipelineBatchExecution(batchExecutionId);
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecutionId, error.message);
    }
  }

  @Post('pipeline/comparison/:companyId')
  @ApiOperation({ summary: 'Run comparison pipeline for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({
    status: 202,
    description: 'Comparison pipeline started',
  })
  async runComparisonPipeline(@Param('companyId') companyId: string) {
    // Get company data
    const companyContext = await this.batchService.getCompanyBatchContext(companyId);
    if (!companyContext) {
      throw new NotFoundException(`Company context not found for ID: ${companyId}`);
    }

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(companyId, 'comparison');
    const batchExecutionId = batchExecution.id;

    // Process in background
    this.processComparisonPipeline(companyContext, batchExecutionId);
    
    // Return immediately with the batch execution ID
    return {
      success: true,
      message: `Comparison pipeline for company ${companyId} started`,
      batchExecutionId,
    };
  }
  
  // Background processing method for comparison pipeline
  private async processComparisonPipeline(companyContext: any, batchExecutionId: string) {
    // Add batch execution ID to context
    const contextWithExecId = { ...companyContext, batchExecutionId };

    try {
      // Run pipeline
      const result = await this.batchService.runComparisonPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecutionId, 'comparison', result);

      // Mark batch execution as completed
      await this.batchService.completeSinglePipelineBatchExecution(batchExecutionId);
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecutionId, error.message);
    }
  }
}
