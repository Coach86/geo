import { Controller, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BatchService } from '../services/batch.service';
import { BatchTask } from '../tasks/batch.task';
import { CompanyBatchOrchestratorService } from '../services/company-batch-orchestrator.service';
import { BatchEventsGateway } from '../gateways/batch-events.gateway';

class BatchRunDto {
  @IsString()
  @IsOptional()
  companyId?: string;
}

@ApiTags('batch')
@Controller('admin/batch')
export class BatchController {
  constructor(
    private readonly batchService: BatchService,
    private readonly batchTask: BatchTask,
    private readonly batchOrchestratorService: CompanyBatchOrchestratorService,
    private readonly batchEventsGateway: BatchEventsGateway,
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
    try {
      // Get company context to access brandName
      const companyContext = await this.batchService.getCompanyBatchContext(companyId);
      if (!companyContext) {
        throw new NotFoundException(`Company context not found for ID: ${companyId}`);
      }

      // Create a new batch execution record
      const batchExecution = await this.batchService.createBatchExecution(companyId);
      console.log(`[Batch] Created new batch execution ${batchExecution.id} for company ${companyId}`);

      // Emit batch started event
      this.batchEventsGateway.emitBatchStarted(
        batchExecution.id,
        companyId,
        companyContext.brandName,
        'full'
      );

      // Start the batch processing in the background (don't await)
      this.batchService
        .processCompany(companyId, batchExecution.id)
        .then((result) => {
          console.log(`[Batch] Completed batch execution ${batchExecution.id} for company ${companyId}`);
          this.batchService.completeBatchExecution(batchExecution.id, result);
          
          // Emit batch completed event
          this.batchEventsGateway.emitBatchCompleted(
            batchExecution.id,
            companyId,
            companyContext.brandName,
            'full'
          );
        })
        .catch((error) => {
          console.log(`[Batch] Failed batch execution ${batchExecution.id} for company ${companyId}: ${error.message}`);
          this.batchService.failBatchExecution(batchExecution.id, error.message || 'Unknown error');
          
          // Emit batch failed event
          this.batchEventsGateway.emitBatchFailed(
            batchExecution.id,
            companyId,
            companyContext.brandName,
            'full',
            error.message || 'Unknown error'
          );
        });

      // Return immediately with the batch execution ID
      return {
        success: true,
        message: `Batch processing for company ${companyId} started`,
        batchExecutionId: batchExecution.id,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to start batch processing for company ${companyId}: ${error.message}`,
        error: error.message,
      };
    }
  }

  @Post('orchestrate/:companyId')
  @ApiOperation({
    summary: 'Orchestrate all batches for a company and generate report with email notification',
  })
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
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(
      companyId,
      'spontaneous',
    );
    const batchExecutionId = batchExecution.id;

    // Emit batch started event
    this.batchEventsGateway.emitBatchStarted(
      batchExecutionId,
      companyId,
      companyContext.brandName,
      'spontaneous'
    );

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
      // Emit pipeline started event
      this.batchEventsGateway.emitPipelineStarted(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'spontaneous'
      );

      // Run pipeline
      const result = await this.batchService.runSpontaneousPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecutionId, 'spontaneous', result);

      // Mark batch execution as completed
      await this.batchService.completeSinglePipelineBatchExecution(batchExecutionId);

      // Emit completion events
      this.batchEventsGateway.emitPipelineCompleted(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'spontaneous'
      );
      this.batchEventsGateway.emitBatchCompleted(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'spontaneous'
      );
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecutionId, error.message);

      // Emit failure events
      this.batchEventsGateway.emitPipelineFailed(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'spontaneous',
        error.message
      );
      this.batchEventsGateway.emitBatchFailed(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'spontaneous',
        error.message
      );
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
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(
      companyId,
      'sentiment',
    );
    const batchExecutionId = batchExecution.id;

    // Emit batch started event
    this.batchEventsGateway.emitBatchStarted(
      batchExecutionId,
      companyId,
      companyContext.brandName,
      'sentiment'
    );

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
      // Emit pipeline started event
      this.batchEventsGateway.emitPipelineStarted(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'sentiment'
      );

      // Run pipeline
      const result = await this.batchService.runSentimentPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecutionId, 'sentiment', result);

      // Mark batch execution as completed
      await this.batchService.completeSinglePipelineBatchExecution(batchExecutionId);

      // Emit completion events
      this.batchEventsGateway.emitPipelineCompleted(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'sentiment'
      );
      this.batchEventsGateway.emitBatchCompleted(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'sentiment'
      );
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecutionId, error.message);

      // Emit failure events
      this.batchEventsGateway.emitPipelineFailed(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'sentiment',
        error.message
      );
      this.batchEventsGateway.emitBatchFailed(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'sentiment',
        error.message
      );
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
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(
      companyId,
      'comparison',
    );
    const batchExecutionId = batchExecution.id;

    // Emit batch started event
    this.batchEventsGateway.emitBatchStarted(
      batchExecutionId,
      companyId,
      companyContext.brandName,
      'comparison'
    );

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
      // Emit pipeline started event
      this.batchEventsGateway.emitPipelineStarted(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'comparison'
      );

      // Run pipeline
      const result = await this.batchService.runComparisonPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecutionId, 'comparison', result);

      // Mark batch execution as completed
      await this.batchService.completeSinglePipelineBatchExecution(batchExecutionId);

      // Emit completion events
      this.batchEventsGateway.emitPipelineCompleted(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'comparison'
      );
      this.batchEventsGateway.emitBatchCompleted(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'comparison'
      );
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecutionId, error.message);

      // Emit failure events
      this.batchEventsGateway.emitPipelineFailed(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'comparison',
        error.message
      );
      this.batchEventsGateway.emitBatchFailed(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'comparison',
        error.message
      );
    }
  }

  @Post('pipeline/accuracy/:companyId')
  @ApiOperation({ summary: 'Run accuracy analysis pipeline for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({
    status: 202,
    description: 'Accuracy analysis pipeline started',
  })
  async runAccuracyPipeline(@Param('companyId') companyId: string) {
    // Get company data
    const companyContext = await this.batchService.getCompanyBatchContext(companyId);
    if (!companyContext) {
      throw new NotFoundException(`Company context not found for ID: ${companyId}`);
    }

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(
      companyId,
      'accuracy',
    );
    const batchExecutionId = batchExecution.id;

    // Emit batch started event
    this.batchEventsGateway.emitBatchStarted(
      batchExecutionId,
      companyId,
      companyContext.brandName,
      'accuracy'
    );

    // Process in background
    this.processAccuracyPipeline(companyContext, batchExecutionId);

    // Return immediately with the batch execution ID
    return {
      success: true,
      message: `Accuracy pipeline for company ${companyId} started`,
      batchExecutionId,
    };
  }

  // Background processing method for accuracy pipeline
  private async processAccuracyPipeline(companyContext: any, batchExecutionId: string) {
    // Add batch execution ID to context
    const contextWithExecId = { ...companyContext, batchExecutionId };

    try {
      // Emit pipeline started event
      this.batchEventsGateway.emitPipelineStarted(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'accuracy'
      );

      // Run pipeline
      const result = await this.batchService.runAccuracyPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecutionId, 'accuracy', result);

      // Mark batch execution as completed
      await this.batchService.completeSinglePipelineBatchExecution(batchExecutionId);

      // Emit completion events
      this.batchEventsGateway.emitPipelineCompleted(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'accuracy'
      );
      this.batchEventsGateway.emitBatchCompleted(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'accuracy'
      );
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecutionId, error.message);

      // Emit failure events
      this.batchEventsGateway.emitPipelineFailed(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'accuracy',
        error.message
      );
      this.batchEventsGateway.emitBatchFailed(
        batchExecutionId,
        companyContext.companyId,
        companyContext.brandName,
        'accuracy',
        error.message
      );
    }
  }
}
