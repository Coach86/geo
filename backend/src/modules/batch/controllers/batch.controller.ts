import { Controller, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BatchService } from '../services/batch.service';
import { BatchTask } from '../tasks/batch.task';
import { ProjectBatchOrchestratorService } from '../services/project-batch-orchestrator.service';
import { BatchEventsGateway } from '../gateways/batch-events.gateway';

class BatchRunDto {
  @IsString()
  @IsOptional()
  projectId?: string;
}

@ApiTags('batch')
@Controller('admin/batch')
export class BatchController {
  constructor(
    private readonly batchService: BatchService,
    private readonly batchTask: BatchTask,
    private readonly batchOrchestratorService: ProjectBatchOrchestratorService,
    private readonly batchEventsGateway: BatchEventsGateway,
  ) {}

  @Post('run')
  @ApiOperation({ summary: 'Manually trigger batch processing' })
  @ApiResponse({
    status: 200,
    description: 'Batch processing completed successfully',
  })
  async runBatch(@Body() batchRunDto: BatchRunDto) {
    if (batchRunDto.projectId) {
      // If project ID is provided, run batch for only that project
      const result = await this.batchService.processProject(batchRunDto.projectId);
      return {
        success: true,
        message: 'Batch processing completed for specific project',
        result,
      };
    } else {
      // Otherwise run the full batch
      const result = await this.batchTask.triggerManualBatch();
      return result;
    }
  }

  @Post('process/:projectId')
  @ApiOperation({ summary: 'Process a specific project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project to process' })
  @ApiResponse({
    status: 202,
    description: 'Project batch processing started successfully',
  })
  async processProject(@Param('projectId') projectId: string) {
    try {
      // Get project context to access brandName
      const projectContext = await this.batchService.getProjectBatchContext(projectId);
      if (!projectContext) {
        throw new NotFoundException(`Project context not found for ID: ${projectId}`);
      }

      // Create a new batch execution record
      const batchExecution = await this.batchService.createBatchExecution(projectId);
      console.log(`[Batch] Created new batch execution ${batchExecution.id} for project ${projectId}`);

      // Emit batch started event
      this.batchEventsGateway.emitBatchStarted(
        batchExecution.id,
        projectId,
        projectContext.brandName,
        'full'
      );

      // Start the batch processing in the background (don't await)
      this.batchService
        .processProject(projectId, batchExecution.id)
        .then((result) => {
          console.log(`[Batch] Completed batch execution ${batchExecution.id} for project ${projectId}`);
          this.batchService.completeBatchExecution(batchExecution.id, result);
          
          // Emit batch completed event
          this.batchEventsGateway.emitBatchCompleted(
            batchExecution.id,
            projectId,
            projectContext.brandName,
            'full'
          );
        })
        .catch((error) => {
          console.log(`[Batch] Failed batch execution ${batchExecution.id} for project ${projectId}: ${error.message}`);
          this.batchService.failBatchExecution(batchExecution.id, error.message || 'Unknown error');
          
          // Emit batch failed event
          this.batchEventsGateway.emitBatchFailed(
            batchExecution.id,
            projectId,
            projectContext.brandName,
            'full',
            error.message || 'Unknown error'
          );
        });

      // Return immediately with the batch execution ID
      return {
        success: true,
        message: `Batch processing for project ${projectId} started`,
        batchExecutionId: batchExecution.id,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to start batch processing for project ${projectId}: ${error.message}`,
        error: error.message,
      };
    }
  }

  @Post('orchestrate/:projectId')
  @ApiOperation({
    summary: 'Orchestrate all batches for a project and generate report with email notification',
  })
  @ApiParam({ name: 'projectId', description: 'The ID of the project to process' })
  @ApiResponse({
    status: 200,
    description: 'Project batches orchestrated successfully',
  })
  async orchestrateProject(@Param('projectId') projectId: string) {
    const result = await this.batchTask.triggerProjectBatch(projectId);
    return {
      success: true,
      message: `Project ${projectId} batches orchestrated and report generated`,
      result,
    };
  }

  @Post('pipeline/spontaneous/:projectId')
  @ApiOperation({ summary: 'Run spontaneous mentions pipeline for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 202,
    description: 'Spontaneous mentions pipeline started',
  })
  async runSpontaneousPipeline(@Param('projectId') projectId: string) {
    // Get project data
    const projectContext = await this.batchService.getProjectBatchContext(projectId);
    if (!projectContext) {
      throw new NotFoundException(`Project context not found for ID: ${projectId}`);
    }

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(
      projectId,
      'spontaneous',
    );
    const batchExecutionId = batchExecution.id;

    // Emit batch started event
    this.batchEventsGateway.emitBatchStarted(
      batchExecutionId,
      projectId,
      projectContext.brandName,
      'spontaneous'
    );

    // Process in background
    this.processSpontaneousPipeline(projectContext, batchExecutionId);

    // Return immediately with the batch execution ID
    return {
      success: true,
      message: `Spontaneous pipeline for project ${projectId} started`,
      batchExecutionId,
    };
  }

  // Background processing method for spontaneous pipeline
  private async processSpontaneousPipeline(projectContext: any, batchExecutionId: string) {
    // Add batch execution ID to context
    const contextWithExecId = { ...projectContext, batchExecutionId };

    try {
      // Emit pipeline started event
      this.batchEventsGateway.emitPipelineStarted(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
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
        projectContext.projectId,
        projectContext.brandName,
        'spontaneous'
      );
      this.batchEventsGateway.emitBatchCompleted(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'spontaneous'
      );
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecutionId, error.message);

      // Emit failure events
      this.batchEventsGateway.emitPipelineFailed(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'spontaneous',
        error.message
      );
      this.batchEventsGateway.emitBatchFailed(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'spontaneous',
        error.message
      );
    }
  }

  @Post('pipeline/sentiment/:projectId')
  @ApiOperation({ summary: 'Run sentiment analysis pipeline for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 202,
    description: 'Sentiment analysis pipeline started',
  })
  async runSentimentPipeline(@Param('projectId') projectId: string) {
    // Get project data
    const projectContext = await this.batchService.getProjectBatchContext(projectId);
    if (!projectContext) {
      throw new NotFoundException(`Project context not found for ID: ${projectId}`);
    }

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(
      projectId,
      'sentiment',
    );
    const batchExecutionId = batchExecution.id;

    // Emit batch started event
    this.batchEventsGateway.emitBatchStarted(
      batchExecutionId,
      projectId,
      projectContext.brandName,
      'sentiment'
    );

    // Process in background
    this.processSentimentPipeline(projectContext, batchExecutionId);

    // Return immediately with the batch execution ID
    return {
      success: true,
      message: `Sentiment pipeline for project ${projectId} started`,
      batchExecutionId,
    };
  }

  // Background processing method for sentiment pipeline
  private async processSentimentPipeline(projectContext: any, batchExecutionId: string) {
    // Add batch execution ID to context
    const contextWithExecId = { ...projectContext, batchExecutionId };

    try {
      // Emit pipeline started event
      this.batchEventsGateway.emitPipelineStarted(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
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
        projectContext.projectId,
        projectContext.brandName,
        'sentiment'
      );
      this.batchEventsGateway.emitBatchCompleted(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'sentiment'
      );
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecutionId, error.message);

      // Emit failure events
      this.batchEventsGateway.emitPipelineFailed(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'sentiment',
        error.message
      );
      this.batchEventsGateway.emitBatchFailed(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'sentiment',
        error.message
      );
    }
  }

  @Post('pipeline/comparison/:projectId')
  @ApiOperation({ summary: 'Run comparison pipeline for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 202,
    description: 'Comparison pipeline started',
  })
  async runComparisonPipeline(@Param('projectId') projectId: string) {
    // Get project data
    const projectContext = await this.batchService.getProjectBatchContext(projectId);
    if (!projectContext) {
      throw new NotFoundException(`Project context not found for ID: ${projectId}`);
    }

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(
      projectId,
      'comparison',
    );
    const batchExecutionId = batchExecution.id;

    // Emit batch started event
    this.batchEventsGateway.emitBatchStarted(
      batchExecutionId,
      projectId,
      projectContext.brandName,
      'comparison'
    );

    // Process in background
    this.processComparisonPipeline(projectContext, batchExecutionId);

    // Return immediately with the batch execution ID
    return {
      success: true,
      message: `Comparison pipeline for project ${projectId} started`,
      batchExecutionId,
    };
  }

  // Background processing method for comparison pipeline
  private async processComparisonPipeline(projectContext: any, batchExecutionId: string) {
    // Add batch execution ID to context
    const contextWithExecId = { ...projectContext, batchExecutionId };

    try {
      // Emit pipeline started event
      this.batchEventsGateway.emitPipelineStarted(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
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
        projectContext.projectId,
        projectContext.brandName,
        'comparison'
      );
      this.batchEventsGateway.emitBatchCompleted(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'comparison'
      );
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecutionId, error.message);

      // Emit failure events
      this.batchEventsGateway.emitPipelineFailed(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'comparison',
        error.message
      );
      this.batchEventsGateway.emitBatchFailed(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'comparison',
        error.message
      );
    }
  }

  @Post('pipeline/accuracy/:projectId')
  @ApiOperation({ summary: 'Run accuracy analysis pipeline for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 202,
    description: 'Accuracy analysis pipeline started',
  })
  async runAccuracyPipeline(@Param('projectId') projectId: string) {
    // Get project data
    const projectContext = await this.batchService.getProjectBatchContext(projectId);
    if (!projectContext) {
      throw new NotFoundException(`Project context not found for ID: ${projectId}`);
    }

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(
      projectId,
      'accuracy',
    );
    const batchExecutionId = batchExecution.id;

    // Emit batch started event
    this.batchEventsGateway.emitBatchStarted(
      batchExecutionId,
      projectId,
      projectContext.brandName,
      'accuracy'
    );

    // Process in background
    this.processAccuracyPipeline(projectContext, batchExecutionId);

    // Return immediately with the batch execution ID
    return {
      success: true,
      message: `Accuracy pipeline for project ${projectId} started`,
      batchExecutionId,
    };
  }

  // Background processing method for accuracy pipeline
  private async processAccuracyPipeline(projectContext: any, batchExecutionId: string) {
    // Add batch execution ID to context
    const contextWithExecId = { ...projectContext, batchExecutionId };

    try {
      // Emit pipeline started event
      this.batchEventsGateway.emitPipelineStarted(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
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
        projectContext.projectId,
        projectContext.brandName,
        'accuracy'
      );
      this.batchEventsGateway.emitBatchCompleted(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'accuracy'
      );
    } catch (error) {
      // Mark batch execution as failed
      await this.batchService.failSinglePipelineBatchExecution(batchExecutionId, error.message);

      // Emit failure events
      this.batchEventsGateway.emitPipelineFailed(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'accuracy',
        error.message
      );
      this.batchEventsGateway.emitBatchFailed(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'accuracy',
        error.message
      );
    }
  }
}
