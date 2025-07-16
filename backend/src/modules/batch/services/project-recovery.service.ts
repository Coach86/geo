import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProjectService } from '../../project/services/project.service';
import { OrganizationService } from '../../organization/services/organization.service';
import { PlanService } from '../../plan/services/plan.service';
import { BatchService } from './batch.service';
import { BrandReportOrchestratorService } from './brand-report-orchestrator.service';
import { Project, ProjectDocument } from '../../project/schemas/project-base.schema';
import { BrandReport, BrandReportDocument } from '../../report/schemas/brand-report.schema';

@Injectable()
export class ProjectRecoveryService {
  private readonly logger = new Logger(ProjectRecoveryService.name);

  constructor(
    @InjectModel('Project') private projectModel: Model<ProjectDocument>,
    @InjectModel('BrandReport') private brandReportModel: Model<BrandReportDocument>,
    private readonly projectService: ProjectService,
    private readonly organizationService: OrganizationService,
    private readonly planService: PlanService,
    private readonly batchService: BatchService,
    private readonly brandReportOrchestratorService: BrandReportOrchestratorService,
  ) {}

  /**
   * Find and recover projects that have no brand reports
   * Only processes projects created more than 30 minutes ago that haven't had recovery attempted
   */
  async recoverProjectsWithoutReports(): Promise<void> {
    this.logger.log('Starting project recovery check...');

    try {
      // Calculate 30 minutes ago
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Find projects without reports using aggregation
      const projectsWithoutReports = await this.projectModel.aggregate([
        {
          // Match projects created more than 30 minutes ago without recovery attempt
          $match: {
            createdAt: { $lt: thirtyMinutesAgo },
            $or: [{ recoveryAttemptedAt: { $exists: false } }, { recoveryAttemptedAt: null }],
          },
        },
        {
          // Left join with brand_reports
          $lookup: {
            from: 'brand_reports',
            localField: 'id',
            foreignField: 'projectId',
            as: 'reports',
          },
        },
        {
          // Filter to only projects with no reports
          $match: {
            reports: { $size: 0 },
          },
        },
        {
          // Limit to avoid processing too many at once
          $limit: 20,
        },
      ]);

      this.logger.log(
        `Found ${projectsWithoutReports.length} projects without reports for recovery`,
      );

      // Process each project
      for (const projectDoc of projectsWithoutReports) {
        try {
          await this.recoverSingleProject(projectDoc);
        } catch (error) {
          this.logger.error(
            `Failed to recover project ${projectDoc.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log('Project recovery check completed');
    } catch (error) {
      this.logger.error(`Failed to run project recovery: ${error.message}`, error.stack);
    }
  }

  /**
   * Recover a single project by triggering appropriate batch processing
   */
  private async recoverSingleProject(projectDoc: ProjectDocument): Promise<void> {
    const projectId = projectDoc.id;

    this.logger.log(`Attempting recovery for project ${projectId} (${projectDoc.brandName})`);

    try {
      // Mark recovery as attempted immediately to prevent duplicate attempts
      await this.projectModel.updateOne(
        { id: projectId },
        { $set: { recoveryAttemptedAt: new Date() } },
      );

      // Get the organization and plan details
      const organization = await this.organizationService.findOne(projectDoc.organizationId);
      if (!organization) {
        this.logger.warn(`Organization not found for project ${projectId}`);
        return;
      }

      // Check if it's a free plan
      // Free plan = no stripePlanId (undefined)
      // Paid plan = has stripePlanId (including 'manual')
      const isFreePlan = !organization.stripePlanId;

      // Get project context for batch processing
      const projectContext = await this.batchService.getProjectBatchContext(projectId);
      if (!projectContext) {
        this.logger.warn(`Could not get batch context for project ${projectId}`);
        return;
      }

      this.logger.log(`Running recovery batch for project ${projectId} (free plan: ${isFreePlan})`);

      if (isFreePlan) {
        // For free plans, run visibility-only batch
        await this.processVisibilityOnlyRecovery(projectContext, projectId);
        this.logger.log(`Completed visibility-only recovery for free plan project ${projectId}`);
      } else {
        // For paid plans, run full batch orchestration
        await this.brandReportOrchestratorService.orchestrateProjectBatches(projectId);
        this.logger.log(`Completed full recovery for paid plan project ${projectId}`);
      }
    } catch (error) {
      this.logger.error(`Recovery failed for project ${projectId}: ${error.message}`, error.stack);
      // Don't throw - continue with other projects
    }
  }

  /**
   * Process visibility-only recovery for free plan projects
   */
  private async processVisibilityOnlyRecovery(
    projectContext: any,
    projectId: string,
    triggerSource: 'cron' | 'manual' | 'project_creation' = 'manual',
  ): Promise<void> {
    // Create a new batch execution
    const batchExecution = await this.batchService.createBatchExecution(projectId, triggerSource);
    const batchExecutionId = batchExecution.id;

    // Add batch execution ID and triggerSource to context
    const contextWithExecId = { ...projectContext, batchExecutionId, triggerSource };

    try {
      // Run only visibility pipeline
      const visibilityResults = await this.batchService.runVisibilityPipeline(contextWithExecId);

      // Create empty results for other pipelines
      const sentimentResults = {
        results: [],
        summary: {
          overallSentiment: 'neutral' as const,
          overallSentimentPercentage: 0,
        },
        webSearchSummary: {
          usedWebSearch: false,
          webSearchCount: 0,
          consultedWebsites: [],
        },
      };
      const alignmentResults = {
        results: [],
        summary: {
          averageAttributeScores: {},
        },
        webSearchSummary: {
          usedWebSearch: false,
          webSearchCount: 0,
          consultedWebsites: [],
        },
      };
      const competitionResults = {
        results: [],
        summary: {
          competitorAnalyses: [],
          commonStrengths: [],
          commonWeaknesses: [],
        },
        webSearchSummary: {
          usedWebSearch: false,
          webSearchCount: 0,
          consultedWebsites: [],
        },
      };

      // Save all results
      await Promise.all([
        this.batchService.saveSinglePipelineResult(
          batchExecutionId,
          'visibility',
          visibilityResults,
        ),
        this.batchService.saveSinglePipelineResult(batchExecutionId, 'sentiment', sentimentResults),
        this.batchService.saveSinglePipelineResult(batchExecutionId, 'alignment', alignmentResults),
        this.batchService.saveSinglePipelineResult(
          batchExecutionId,
          'competition',
          competitionResults,
        ),
      ]);

      // Create and save the visibility-only report
      await this.batchService.createVisibilityOnlyReport(
        batchExecutionId,
        visibilityResults,
        sentimentResults,
        alignmentResults,
        competitionResults,
        contextWithExecId,
      );

      // Mark the batch as completed
      await this.batchService.completeBatchExecution(batchExecutionId, {
        visibility: visibilityResults,
        sentiment: sentimentResults,
        alignment: alignmentResults,
        competition: competitionResults,
      });
    } catch (error) {
      // Mark the batch as failed
      await this.batchService.failBatchExecution(
        batchExecutionId,
        error.message || 'Unknown error',
      );
      throw error;
    }
  }

  /**
   * Check if a project has any brand reports
   */
  async projectHasReports(projectId: string): Promise<boolean> {
    const count = await this.brandReportModel.countDocuments({ projectId });
    return count > 0;
  }
}
