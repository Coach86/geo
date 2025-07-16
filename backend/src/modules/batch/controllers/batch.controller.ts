import { Controller, Post, Body, Param, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BatchService } from '../services/batch.service';
import { BatchTask } from '../tasks/batch.task';
import { BrandReportOrchestratorService } from '../services/brand-report-orchestrator.service';
import { BatchEventsGateway } from '../gateways/batch-events.gateway';
import { OrganizationService } from '../../organization/services/organization.service';
import { PlanService } from '../../plan/services/plan.service';
import { ProjectService } from '../../project/services/project.service';
import { BrandReportPersistenceService } from '../../report/services/brand-report-persistence.service';
import { ReportStructure } from '../../report/interfaces/report.interfaces';
import { SentimentResults, AlignmentResults, CompetitionResults } from '../interfaces/batch.interfaces';
import { ReportBuilderService } from '../services/report-builder.service';

class BatchRunDto {
  @IsString()
  @IsOptional()
  projectId?: string;
}

@ApiTags('Admin - Batch Processing')
@Controller('admin/batch')
export class BatchController {
  constructor(
    private readonly batchService: BatchService,
    private readonly batchTask: BatchTask,
    private readonly batchOrchestratorService: BrandReportOrchestratorService,
    private readonly batchEventsGateway: BatchEventsGateway,
    @Inject(forwardRef(() => OrganizationService))
    private readonly organizationService: OrganizationService,
    @Inject(forwardRef(() => PlanService))
    private readonly planService: PlanService,
    @Inject(forwardRef(() => ProjectService))
    private readonly projectService: ProjectService,
    private readonly brandReportPersistenceService: BrandReportPersistenceService,
    private readonly reportBuilderService: ReportBuilderService,
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
      const batchExecution = await this.batchService.createBatchExecution(projectId, 'manual');
      console.log(`[Batch] Created new batch execution ${batchExecution.id} for project ${projectId}`);

      // Check if organization has a free plan
      let batchType = 'full';
      let isFreePlan = false;
      if (projectContext.organizationId) {
        try {
          const organization = await this.organizationService.findOne(projectContext.organizationId);
          // Free plan = no stripePlanId (undefined)
          // Paid plan = has stripePlanId (including 'manual')
          isFreePlan = !organization.stripePlanId;
          
          if (isFreePlan) {
            batchType = 'visibility';
            console.log(`[Batch] Organization ${projectContext.organizationId} has free plan - will only process visibility`);
          }
        } catch (error) {
          console.warn(`[Batch] Could not check plan for organization ${projectContext.organizationId}: ${error.message}`);
        }
      }

      // Emit batch started event
      this.batchEventsGateway.emitBatchStarted(
        batchExecution.id,
        projectId,
        projectContext.brandName,
        batchType
      );

      // Start the batch processing in the background (don't await)
      if (isFreePlan) {
        // For free plans, only run visibility pipeline
        this.processVisibilityOnlyBatch(projectContext, batchExecution.id)
          .then(() => {
            console.log(`[Batch] Completed visibility-only batch execution ${batchExecution.id} for project ${projectId}`);
            
            // Emit batch completed event
            this.batchEventsGateway.emitBatchCompleted(
              batchExecution.id,
              projectId,
              projectContext.brandName,
              'visibility'
            );
          })
          .catch((error) => {
            console.log(`[Batch] Failed visibility-only batch execution ${batchExecution.id} for project ${projectId}: ${error.message}`);
            this.batchService.failBatchExecution(batchExecution.id, error.message || 'Unknown error');
            
            // Emit batch failed event
            this.batchEventsGateway.emitBatchFailed(
              batchExecution.id,
              projectId,
              projectContext.brandName,
              'visibility',
              error.message || 'Unknown error'
            );
          });
      } else {
        // For paid plans, run all pipelines
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
      }

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

  @Post('pipeline/visibility/:projectId')
  @ApiOperation({ summary: 'Run visibility mentions pipeline for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 202,
    description: 'Visibility mentions pipeline started',
  })
  async runVisibilityPipeline(@Param('projectId') projectId: string) {
    // Get project data
    const projectContext = await this.batchService.getProjectBatchContext(projectId);
    if (!projectContext) {
      throw new NotFoundException(`Project context not found for ID: ${projectId}`);
    }

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(
      projectId,
      'visibility',
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

  // Background processing method for visibility-only batch (free plan)
  private async processVisibilityOnlyBatch(projectContext: any, batchExecutionId: string) {
    // Add batch execution ID to context
    const contextWithExecId = { ...projectContext, batchExecutionId };

    try {
      // Run only visibility pipeline
      const visibilityResults = await this.batchService.runVisibilityPipeline(contextWithExecId);

      // Create empty results for other pipelines with proper structure
      const sentimentResults: SentimentResults = { 
        results: [], 
        summary: {
          overallSentiment: 'neutral',
          overallSentimentPercentage: 0
        },
        webSearchSummary: {
          usedWebSearch: false,
          webSearchCount: 0,
          consultedWebsites: []
        }
      };
      const alignmentResults: AlignmentResults = { 
        results: [], 
        summary: {
          averageAttributeScores: {}
        },
        webSearchSummary: {
          usedWebSearch: false,
          webSearchCount: 0,
          consultedWebsites: []
        }
      };
      const competitionResults: CompetitionResults = { 
        results: [], 
        summary: {
          competitorAnalyses: [],
          commonStrengths: [],
          commonWeaknesses: []
        },
        webSearchSummary: {
          usedWebSearch: false,
          webSearchCount: 0,
          consultedWebsites: []
        }
      };

      // Save all results
      await Promise.all([
        this.batchService.saveSinglePipelineResult(batchExecutionId, 'visibility', visibilityResults),
        this.batchService.saveSinglePipelineResult(batchExecutionId, 'sentiment', sentimentResults),
        this.batchService.saveSinglePipelineResult(batchExecutionId, 'alignment', alignmentResults),
        this.batchService.saveSinglePipelineResult(batchExecutionId, 'competition', competitionResults),
      ]);

      // Get project details for report metadata
      const project = await this.projectService.findById(projectContext.projectId);
      if (!project) {
        throw new Error(`Project ${projectContext.projectId} not found`);
      }

      // Create the brand report structure (similar to batch.service.ts)
      const reportDate = new Date();
      
      // Extract models used from visibility results
      const modelsUsed = new Set<string>();
      if (visibilityResults?.results) {
        visibilityResults.results.forEach((result: any) => {
          if (result.model) modelsUsed.add(result.model);
        });
      }
      
      const brandReport: ReportStructure = {
        id: batchExecutionId, // Use batch execution ID as report ID
        projectId: project.projectId,
        reportDate,
        generatedAt: new Date(),
        batchExecutionId,
        brandName: project.brandName,
        metadata: {
          url: project.website || '',
          market: project.market || '',
          countryCode: project.market || 'US', // Default to US if not specified
          competitors: project.competitors || [],
          modelsUsed: Array.from(modelsUsed),
          promptsExecuted: visibilityResults?.results?.length || 0,
          executionContext: {
            batchId: batchExecutionId,
            pipeline: 'visibility-only',
            version: '2.0.0',
          },
        },
        // For free plans, build explorer data from visibility pipeline only
        explorer: this.reportBuilderService.buildExplorerData(visibilityResults, sentimentResults, alignmentResults, competitionResults, project.website),
        visibility: await this.reportBuilderService.buildVisibilityData(visibilityResults, project.brandName, project.competitors || []),
        sentiment: {
          overallScore: 0,
          overallSentiment: 'neutral' as const,
          distribution: {
            positive: 0,
            neutral: 0,
            negative: 0,
            total: 0,
          },
          modelSentiments: [],
          heatmapData: [],
        },
        alignment: {
          summary: {
            overallAlignmentScore: 0,
            averageAttributeScores: {},
            attributeAlignmentSummary: [],
          },
          detailedResults: [],
        },
        competition: {
          brandName: project.brandName,
          competitors: project.competitors || [],
          competitorAnalyses: [],
          competitorMetrics: [],
          commonStrengths: [],
          commonWeaknesses: [],
        },
      };

      // Save the report
      await this.brandReportPersistenceService.saveReport(brandReport);
      console.log(`[Batch] Successfully saved brand report for project ${projectContext.projectId}`);

      // Mark batch execution as completed
      await this.batchService.completeBatchExecution(batchExecutionId, {
        batchExecutionId,
        results: {
          visibility: visibilityResults,
          sentiment: sentimentResults,
          alignment: alignmentResults,
          competition: competitionResults,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  // Background processing method for visibility pipeline
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
      const result = await this.batchService.runVisibilityPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecutionId, 'visibility', result);

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
        'visibility',
        error.message
      );
      this.batchEventsGateway.emitBatchFailed(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'visibility',
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

  @Post('pipeline/competition/:projectId')
  @ApiOperation({ summary: 'Run competition pipeline for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 202,
    description: 'Competition pipeline started',
  })
  async runCompetitionPipeline(@Param('projectId') projectId: string) {
    // Get project data
    const projectContext = await this.batchService.getProjectBatchContext(projectId);
    if (!projectContext) {
      throw new NotFoundException(`Project context not found for ID: ${projectId}`);
    }

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(
      projectId,
      'competition',
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

  // Background processing method for competition pipeline
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
      const result = await this.batchService.runCompetitionPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecutionId, 'competition', result);

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
        'competition',
        error.message
      );
      this.batchEventsGateway.emitBatchFailed(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'competition',
        error.message
      );
    }
  }

  @Post('pipeline/alignment/:projectId')
  @ApiOperation({ summary: 'Run alignment analysis pipeline for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 202,
    description: 'Alignment analysis pipeline started',
  })
  async runAlignmentPipeline(@Param('projectId') projectId: string) {
    // Get project data
    const projectContext = await this.batchService.getProjectBatchContext(projectId);
    if (!projectContext) {
      throw new NotFoundException(`Project context not found for ID: ${projectId}`);
    }

    // Create batch execution record
    const batchExecution = await this.batchService.createSinglePipelineBatchExecution(
      projectId,
      'alignment',
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

  // Background processing method for alignment pipeline
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
      const result = await this.batchService.runAlignmentPipeline(contextWithExecId);

      // Save result to batch_results
      await this.batchService.saveSinglePipelineResult(batchExecutionId, 'alignment', result);

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
        'alignment',
        error.message
      );
      this.batchEventsGateway.emitBatchFailed(
        batchExecutionId,
        projectContext.projectId,
        projectContext.brandName,
        'alignment',
        error.message
      );
    }
  }

}
