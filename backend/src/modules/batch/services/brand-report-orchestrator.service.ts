import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BatchService } from './batch.service';
import { BatchExecutionService } from './batch-execution.service';
import { BrandReportPersistenceService } from '../../report/services/brand-report-persistence.service';
import { ProjectService } from '../../project/services/project.service';
import { ReportBuilderService } from './report-builder.service';
import { OrganizationService } from '../../organization/services/organization.service';
import { UserService } from '../../user/services/user.service';
import { ReportCompletedEvent } from '../events/report-completed.event';
import { PlanService } from '../../plan/services/plan.service';
import { PlanResponseDto } from '../../plan/dto/plan-response.dto';
import { OrganizationResponseDto } from '../../organization/dto/organization-response.dto';
import { ProjectResponseDto } from '../../project/dto/project-response.dto';
import { Project } from '../../project/entities/project.entity';
import {
  AccuracyResults,
  ProjectBatchContext,
  ComparisonResults,
  SentimentResults,
  SpontaneousResults,
} from '../interfaces/batch.interfaces';
import {
  ReportStructure,
  ExplorerData,
  VisibilityData,
  SentimentData,
  AlignmentData,
  CompetitionData,
} from '../../report/interfaces/report.interfaces';

/**
 * Service to orchestrate the creation of brand reports with the new structure
 */
@Injectable()
export class BrandReportOrchestratorService {
  private readonly logger = new Logger(BrandReportOrchestratorService.name);

  constructor(
    private readonly batchService: BatchService,
    private readonly batchExecutionService: BatchExecutionService,
    private readonly brandReportPersistenceService: BrandReportPersistenceService,
    private readonly projectService: ProjectService,
    private readonly reportBuilderService: ReportBuilderService,
    private readonly eventEmitter: EventEmitter2,
    private readonly organizationService: OrganizationService,
    private readonly userService: UserService,
    private readonly planService: PlanService,
  ) {}

  /**
   * Check if a project should be refreshed based on its plan settings
   */
  private async shouldRefreshProject(
    project: Project,
    plan: PlanResponseDto | null,
    organization: OrganizationResponseDto,
  ): Promise<boolean> {
    // Free plans should not have automatic refresh
    if (!plan || plan.name?.toLowerCase() === 'free' || !organization.stripeSubscriptionId) {
      this.logger.debug(
        `Project ${project.projectId} is a free plan or has no stripe subscription`,
      );
      return false;
    }

    // Check if project has createdAt date
    if (!project.createdAt) {
      this.logger.warn(`Project ${project.projectId} missing createdAt date`);
      return false;
    }

    const refreshFrequency = plan.refreshFrequency || 'weekly';
    const today = new Date();
    const projectCreatedAt = new Date(project.createdAt);
    this.logger.debug(`Project ${project.projectId} created at: ${projectCreatedAt}`);
    this.logger.debug(`Today: ${today}`);
    this.logger.debug(`Refresh frequency: ${refreshFrequency}`);
    this.logger.debug(`Today day of week: ${today.getDay()}`);
    this.logger.debug(`Created day of week: ${projectCreatedAt.getDay()}`);
    this.logger.debug(`Today day of week: ${today.getDay()}`);
    switch (refreshFrequency) {
      case 'daily':
      case 'unlimited':
        // Refresh daily for both daily and unlimited plans
        return true;
      case 'weekly':
        // Check if today is a weekly anniversary (same day of week)
        const todayDayOfWeek = today.getDay();
        const createdDayOfWeek = projectCreatedAt.getDay();
        return todayDayOfWeek === createdDayOfWeek;
      default:
        // Default to weekly behavior
        const defaultTodayDayOfWeek = today.getDay();
        const defaultCreatedDayOfWeek = projectCreatedAt.getDay();
        return defaultTodayDayOfWeek === defaultCreatedDayOfWeek;
    }
  }

  /**
   * Orchestrate all projects' batches
   * @param triggerSource The source that triggered the batch ('cron', 'manual', 'project_creation')
   */
  async orchestrateAllProjectBatches(
    triggerSource: 'cron' | 'manual' | 'project_creation' = 'manual',
  ) {
    this.logger.log(`Orchestrating batches for all projects (trigger: ${triggerSource})`);

    try {
      // Get all projects from the project service
      const projects = await this.projectService.findAll();

      this.logger.log(`Found ${projects.length} projects to process`);

      const results = {
        successful: 0,
        failed: 0,
        skipped: 0,
        details: [] as any[],
      };

      // Process each project sequentially (to avoid overloading the system)
      for (const project of projects) {
        try {
          // Get the organization and its plan to check refresh frequency
          const organization = await this.organizationService.findOne(project.organizationId);
          if (!organization) {
            this.logger.warn(`Organization not found for project ${project.projectId}`);
            continue;
          }

          // Get the plan details using the organization's planSettings._id
          const planSettings = organization.planSettings as { _id?: string };
          const planId = planSettings?._id;
          let plan: PlanResponseDto | null = null;
          this.logger.debug(`Plan ID: ${planId} for project ${project.projectId}`);

          if (planId) {
            plan = await this.planService.findById(planId);
          }

          // Check if this project should be refreshed today
          const shouldRefresh = await this.shouldRefreshProject(project, plan, organization);

          if (!shouldRefresh) {
            this.logger.log(
              `Skipping project ${project.projectId} (${project.brandName}) - not scheduled for refresh today`,
            );
            results.skipped++;
            results.details.push({
              success: true,
              projectId: project.projectId,
              skipped: true,
              reason: 'Not scheduled for refresh today',
            });
            continue;
          }

          this.logger.log(
            `Processing project ${project.projectId} (${project.brandName}) - scheduled for refresh`,
          );
          const result = await this.orchestrateProjectBatches(project.projectId, triggerSource);

          results.successful++;
          results.details.push(result);
        } catch (error) {
          this.logger.error(
            `Failed to process project ${project.projectId}: ${error.message}`,
            error.stack,
          );
          results.failed++;
          results.details.push({
            success: false,
            projectId: project.projectId,
            error: error.message,
          });
        }
      }

      this.logger.log(
        `Completed processing all projects. Successful: ${results.successful}, Failed: ${results.failed}, Skipped: ${results.skipped}`,
      );
      return results;
    } catch (error) {
      this.logger.error(`Failed to orchestrate all project batches: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Orchestrate the creation of a brand report for a project
   * @param projectId The project ID
   * @param triggerSource The source that triggered the batch ('cron', 'manual', 'project_creation')
   */
  async orchestrateProjectBatches(
    projectId: string,
    triggerSource: 'cron' | 'manual' | 'project_creation' = 'manual',
  ) {
    this.logger.log(
      `Orchestrating brand report for project ${projectId} (trigger: ${triggerSource})`,
    );

    try {
      // Get the project context
      const projectContext = await this.batchService.getProjectBatchContext(projectId);
      if (!projectContext) {
        throw new Error(`Project ${projectId} not found or has insufficient data`);
      }

      // Add triggerSource to context
      const contextWithTrigger = { ...projectContext, triggerSource };

      // Get project details
      const project = await this.projectService.findById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Create a new batch execution
      const batchExecution = await this.batchExecutionService.createBatchExecution(
        projectId,
        triggerSource,
      );
      const batchExecutionId = batchExecution.id;

      // Inject the batchExecutionId into the context
      const contextWithBatchExecId = { ...contextWithTrigger, batchExecutionId };

      // Run the four pipelines in parallel
      const pipelineResults = await Promise.all([
        this.batchService.runVisibilityPipeline(contextWithBatchExecId),
        this.batchService.runSentimentPipeline(contextWithBatchExecId),
        this.batchService.runAlignmentPipeline(contextWithBatchExecId),
        this.batchService.runCompetitionPipeline(contextWithBatchExecId),
      ]);

      const spontaneousResults = pipelineResults[0] as SpontaneousResults;
      const sentimentResults = pipelineResults[1] as SentimentResults;
      const accuracyResults = pipelineResults[2] as AccuracyResults;
      const comparisonResults = pipelineResults[3] as ComparisonResults;

      // Debug logging for competition results
      this.logger.log(
        `[ORCH-001] Received competition results: ${JSON.stringify({
          hasResults: !!comparisonResults,
          resultsCount: comparisonResults?.results?.length || 0,
          hasSummary: !!comparisonResults?.summary,
          competitorAnalysesCount: comparisonResults?.summary?.competitorAnalyses?.length || 0,
          firstResult: comparisonResults?.results?.[0]
            ? {
                model: comparisonResults.results[0].llmModel,
                competitor: comparisonResults.results[0].competitor,
                hasOriginalPrompt: !!comparisonResults.results[0].originalPrompt,
                hasLlmResponse: !!comparisonResults.results[0].llmResponse,
              }
            : null,
        })}`,
      );

      // Extra debug: log raw pipeline result
      if (comparisonResults?.results?.length > 0) {
        this.logger.log(
          `[ORCH-002] Raw first competition result keys: ${Object.keys(comparisonResults.results[0])}`,
        );
        this.logger.log(
          `[ORCH-003] Has llmResponse in first result: ${'llmResponse' in comparisonResults.results[0]}`,
        );
        this.logger.log(
          `[ORCH-004] First result llmResponse length: ${comparisonResults.results[0].llmResponse?.length || 0}`,
        );
      } else {
        this.logger.error(
          `[ORCH-005] Competition results is empty or undefined! comparisonResults: ${JSON.stringify(comparisonResults)}`,
        );
      }

      // Save batch results
      await Promise.all([
        this.batchExecutionService.saveBatchResult(
          batchExecutionId,
          'visibility',
          spontaneousResults,
        ),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'sentiment', sentimentResults),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'alignment', accuracyResults),
        this.batchExecutionService.saveBatchResult(
          batchExecutionId,
          'competition',
          comparisonResults,
        ),
      ]);

      // Create the new report structure
      const reportDate = new Date();
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
          modelsUsed: this.extractModelsUsed(
            spontaneousResults,
            sentimentResults,
            accuracyResults,
            comparisonResults,
          ),
          promptsExecuted: this.countPromptsExecuted(
            spontaneousResults,
            sentimentResults,
            accuracyResults,
            comparisonResults,
          ),
          executionContext: {
            batchId: batchExecutionId,
            pipeline: 'brand-report',
            version: '2.0.0',
          },
        },
        explorer: this.reportBuilderService.buildExplorerData(
          spontaneousResults,
          sentimentResults,
          accuracyResults,
          comparisonResults,
          project.website,
          project.competitorDetails,
        ),
        visibility: this.reportBuilderService.buildVisibilityData(
          spontaneousResults,
          project.brandName,
          project.competitors || [],
        ),
        sentiment: this.reportBuilderService.buildSentimentData(sentimentResults),
        alignment: this.reportBuilderService.buildAlignmentData(accuracyResults),
        competition: (() => {
          this.logger.log(
            `[ORCH-006] About to call buildCompetitionData with ${comparisonResults?.results?.length || 0} results`,
          );
          if (comparisonResults?.results?.length > 0) {
            this.logger.log(
              `[ORCH-007] First result before buildCompetitionData: ${JSON.stringify({
                model: comparisonResults.results[0].llmModel,
                hasLlmResponse: !!comparisonResults.results[0].llmResponse,
                llmResponseLength: comparisonResults.results[0].llmResponse?.length || 0,
              })}`,
            );
          }
          return this.reportBuilderService.buildCompetitionData(
            comparisonResults,
            project.brandName,
            project.competitors || [],
          );
        })(),
      };

      // Save the report
      const savedReport = await this.brandReportPersistenceService.saveReport(brandReport);

      // Mark the batch execution as completed
      await this.batchExecutionService.updateBatchExecutionStatus(batchExecutionId, 'completed');

      // Send email notifications to users in the organization
      if (projectContext.organizationId) {
        try {
          const users = await this.userService.findByOrganizationId(projectContext.organizationId);

          // Emit report completed event for each user in the organization
          for (const user of users) {
            this.eventEmitter.emit(
              'report.completed',
              new ReportCompletedEvent(
                projectId,
                project.brandName,
                batchExecutionId, // Use batch execution ID as report ID
                batchExecutionId,
                user.id,
                user.email,
                'new_project', // Trigger type for post-checkout batch
              ),
            );
          }

          this.logger.log(
            `Emitted report.completed event for ${users.length} users in organization ${projectContext.organizationId}`,
          );
        } catch (error) {
          this.logger.warn(`Failed to emit report.completed event: ${error.message}`);
        }
      }

      this.logger.log(
        `Successfully created brand report ${savedReport.id} for project ${projectId}`,
      );

      return {
        success: true,
        projectId,
        batchExecutionId,
        reportId: savedReport.id,
        message: `Successfully created brand report for ${project.brandName}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create brand report for project ${projectId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private extractModelsUsed(...results: any[]): string[] {
    const models = new Set<string>();
    results.forEach((result) => {
      if (result?.results) {
        result.results.forEach((r: any) => {
          if (r.llmModel) models.add(r.llmModel);
        });
      }
    });
    return Array.from(models);
  }

  private countPromptsExecuted(...results: any[]): number {
    let count = 0;
    results.forEach((result) => {
      if (result?.results) {
        count += result.results.length;
      }
    });
    return count;
  }
}
