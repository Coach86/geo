import {
  Controller,
  Post,
  Param,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { ProjectService } from '../services/project.service';
import { BatchService } from '../../batch/services/batch.service';
import { BatchEventsGateway } from '../../batch/gateways/batch-events.gateway';
import { OrganizationService } from '../../organization/services/organization.service';
import { PlanService } from '../../plan/services/plan.service';
import { BrandReportPersistenceService } from '../../report/services/brand-report-persistence.service';
import { ReportStructure } from '../../report/interfaces/report.interfaces';
import { SentimentResults, AlignmentResults, CompetitionResults } from '../../batch/interfaces/batch.interfaces';
import { ReportBuilderService } from '../../batch/services/report-builder.service';
import { UserService } from '../../user/services/user.service';

@ApiTags('User - Projects')
@Controller('projects')
export class PublicProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly batchService: BatchService,
    private readonly batchEventsGateway: BatchEventsGateway,
    private readonly organizationService: OrganizationService,
    private readonly planService: PlanService,
    private readonly brandReportPersistenceService: BrandReportPersistenceService,
    private readonly reportBuilderService: ReportBuilderService,
    private readonly userService: UserService,
  ) {}

  @Post(':projectId/run-analysis')
  @TokenRoute()
  @ApiOperation({ summary: 'Trigger manual analysis for a project (rate limited)' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 202,
    description: 'Analysis started successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        batchExecutionId: { type: 'string' },
        estimatedDuration: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request or rate limit exceeded' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Analysis not allowed yet - rate limited' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async runManualAnalysis(
    @Req() request: any,
    @Param('projectId') projectId: string,
  ) {
    try {
      // Get user ID from the request (set by TokenAuthGuard)
      const userId = request.userId || request.user?.id;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Get user to check organization
      const user = await this.userService.findOne(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // First, get project to check organization
      const project = await this.projectService.findById(projectId);
      if (!project) {
        throw new NotFoundException(`Project not found with ID: ${projectId}`);
      }

      // SECURITY: Validate that user belongs to the same organization as the project
      if (project.organizationId !== user.organizationId) {
        throw new UnauthorizedException('You do not have permission to access this project');
      }

      // Check if organization has a free plan and block manual analysis for free plans
      if (project.organizationId) {
        try {
          const organization = await this.organizationService.findOne(project.organizationId);
          if (organization.stripePlanId) {
            // 'manual' is a special plan ID that allows manual analysis
            if (organization.stripePlanId === 'manual') {
              // Manual plan is allowed to run analysis
            } else {
              // For other plans, check if it's a free plan
              const plan = await this.planService.findById(organization.stripePlanId);
              // Check if plan is free
              const isFreePlan = plan?.metadata?.isFree === true ||
                plan?.name?.toLowerCase() === 'free' ||
                plan?.stripeProductId === null ||
                plan?.stripeProductId === '';
              if (isFreePlan) {
                throw new ForbiddenException('Manual analysis is only available for paid plans. Please upgrade to unlock this feature.');
              }
            }
          } else {
            // No plan means free plan
            throw new ForbiddenException('Manual analysis is only available for paid plans. Please upgrade to unlock this feature.');
          }
        } catch (error) {
          if (error instanceof ForbiddenException) {
            throw error; // Re-throw ForbiddenException
          }
          // If organization not found or other error, assume free plan
          throw new ForbiddenException('Manual analysis is only available for paid plans. Please upgrade to unlock this feature.');
        }
      } else {
        // No organization means free plan
        throw new ForbiddenException('Manual analysis is only available for paid plans. Please upgrade to unlock this feature.');
      }

      // Check rate limiting using service method
      const rateLimit = await this.projectService.isManualAnalysisAllowed(projectId);

      if (!rateLimit.allowed) {
        console.log(`[RateLimit] Analysis blocked for project ${projectId}. Next allowed: ${rateLimit.formattedTime}`);
        throw new ForbiddenException(rateLimit.formattedTime);
      }

      console.log(`[RateLimit] Analysis allowed for project ${projectId}`);

      // Update the rate limiting field to next day at 8am
      const now = new Date();
      const nextAllowedTime = new Date(now);
      nextAllowedTime.setDate(nextAllowedTime.getDate() + 1); // Next day
      nextAllowedTime.setHours(8, 0, 0, 0); // Set to 8:00 AM

      await this.projectService.updateNextAnalysisTime(projectId, nextAllowedTime);

      // Get project context for batch processing
      const projectContext = await this.batchService.getProjectBatchContext(projectId);
      if (!projectContext) {
        throw new NotFoundException(`Project context not found for ID: ${projectId}`);
      }

      // Mark as manual refresh
      projectContext.isManualRefresh = true;

      // At this point, we know it's a paid plan since free plans were blocked above
      const isFreePlan = false;

      // Create a new batch execution record
      const batchExecution = await this.batchService.createBatchExecution(projectId);
      console.log(`[Public] Created new batch execution ${batchExecution.id} for project ${projectId} (${isFreePlan ? 'visibility-only' : 'full'})`);

      // Emit batch started event
      this.batchEventsGateway.emitBatchStarted(
        batchExecution.id,
        projectId,
        projectContext.brandName,
        isFreePlan ? 'visibility' : 'full'
      );

      // Start the batch processing in the background (don't await)
      if (isFreePlan) {
        // For free plans, only run visibility pipeline
        this.processVisibilityOnlyBatch(projectContext, batchExecution.id)
          .then(() => {
            console.log(`[Public] Completed visibility-only batch execution ${batchExecution.id} for project ${projectId}`);

            // Emit batch completed event
            this.batchEventsGateway.emitBatchCompleted(
              batchExecution.id,
              projectId,
              projectContext.brandName,
              'visibility'
            );
          })
          .catch((error) => {
            console.log(`[Public] Failed visibility-only batch execution ${batchExecution.id} for project ${projectId}: ${error.message}`);
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
          console.log(`[Public] Completed batch execution ${batchExecution.id} for project ${projectId}`);
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
          console.log(`[Public] Failed batch execution ${batchExecution.id} for project ${projectId}: ${error.message}`);
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

      // Return immediately with success message
      return {
        success: true,
        message: 'Analysis started successfully. This process usually takes 5-10 minutes to complete. Please check back later for results.',
        batchExecutionId: batchExecution.id,
        estimatedDuration: '5-10 minutes',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to start analysis for project ${projectId}: ${error.message}`
      );
    }
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
        competition: this.reportBuilderService.buildCompetitionData(competitionResults, project.brandName, project.competitors || []),
      };

      // Save the report
      await this.brandReportPersistenceService.saveReport(brandReport);
      console.log(`[Public] Successfully saved brand report for project ${projectContext.projectId}`);

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

      return {
        batchExecutionId,
        results: {
          visibility: visibilityResults,
          sentiment: sentimentResults,
          alignment: alignmentResults,
          competition: competitionResults,
        },
      };
    } catch (error) {
      // Error handling is done in the calling method
      throw error;
    }
  }

}
