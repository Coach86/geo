import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectService } from '../../project/services/project.service';
import { UserService } from '../../user/services/user.service';
import { OrganizationService } from '../../organization/services/organization.service';
import { BrandReportPersistenceService } from '../../report/services/brand-report-persistence.service';
import { ReportBuilderService } from './report-builder.service';
import { BatchExecutionService } from './batch-execution.service';
import { ReportCompletedEvent } from '../events/report-completed.event';
import {
  ProjectBatchContext,
  VisibilityResults,
  SentimentResults,
  AlignmentResults,
  CompetitionResults,
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
 * Service responsible for generating and saving batch reports.
 * Handles report creation, metadata extraction, and event emission.
 */
@Injectable()
export class BatchReportGenerationService {
  private readonly logger = new Logger(BatchReportGenerationService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly userService: UserService,
    private readonly reportBuilderService: ReportBuilderService,
    private readonly batchExecutionService: BatchExecutionService,
    @Inject(forwardRef(() => OrganizationService))
    private readonly organizationService: OrganizationService,
    @Inject(forwardRef(() => ProjectService))
    private readonly projectService: ProjectService,
    @Inject(forwardRef(() => BrandReportPersistenceService))
    private readonly brandReportPersistenceService: BrandReportPersistenceService,
  ) {}

  /**
   * Extract models used from pipeline results
   */
  private extractModelsUsed(...results: any[]): string[] {
    const models = new Set<string>();
    results.forEach((result) => {
      if (result?.results) {
        result.results.forEach((r: any) => {
          if (r.llmProvider) models.add(r.llmProvider);
        });
      }
    });
    return Array.from(models);
  }

  /**
   * Count prompts executed across all pipeline results
   */
  private countPromptsExecuted(...results: any[]): number {
    let count = 0;
    results.forEach((result) => {
      if (result?.results) {
        count += result.results.length;
      }
    });
    return count;
  }

  /**
   * Create and save a report from visibility-only results (for free plan)
   * @param batchExecutionId The batch execution ID
   * @param visibilityResults The visibility pipeline results
   * @param sentimentResults Empty sentiment results
   * @param alignmentResults Empty alignment results
   * @param competitionResults Empty competition results
   * @param context Project context
   */
  async createVisibilityOnlyReport(
    batchExecutionId: string,
    visibilityResults: any,
    sentimentResults: any,
    alignmentResults: any,
    competitionResults: any,
    context: ProjectBatchContext,
  ): Promise<void> {
    try {
      // Get project details for report metadata
      const project = await this.projectService.findById(context.projectId);
      if (!project) {
        throw new Error(`Project ${context.projectId} not found`);
      }

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
            visibilityResults,
            sentimentResults,
            alignmentResults,
            competitionResults,
          ),
          promptsExecuted: this.countPromptsExecuted(
            visibilityResults,
            sentimentResults,
            alignmentResults,
            competitionResults,
          ),
          executionContext: {
            batchId: batchExecutionId,
            pipeline: 'brand-report',
            version: '2.0.0',
          },
        },
        explorer: this.reportBuilderService.buildExplorerData(
          visibilityResults,
          sentimentResults,
          alignmentResults,
          competitionResults,
          project.website,
          project.competitorDetails,
        ),
        visibility: this.reportBuilderService.buildVisibilityData(
          visibilityResults,
          project.brandName,
          project.competitors || [],
        ),
        sentiment: this.reportBuilderService.buildSentimentData(sentimentResults),
        alignment: this.reportBuilderService.buildAlignmentData(alignmentResults),
        competition: this.reportBuilderService.buildCompetitionData(
          competitionResults,
          project.brandName,
          project.competitors || [],
        ),
      };

      // Save the report using the new persistence service
      await this.brandReportPersistenceService.saveReport(brandReport);
      this.logger.log(
        `Successfully saved visibility-only brand report for project ${context.projectId}`,
      );

      // Mark the batch execution as completed
      await this.batchExecutionService.updateBatchExecutionStatus(batchExecutionId, 'completed');

      // Emit report completed events
      await this.emitReportCompletedEvents(
        context,
        project,
        batchExecutionId,
        'new_project',
      );
    } catch (error) {
      this.logger.error(`Failed to create visibility-only report: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create and save a full report from all pipeline results
   */
  async createFullReport(
    batchExecutionId: string,
    visibilityResults: VisibilityResults,
    sentimentResults: SentimentResults,
    alignmentResults: AlignmentResults,
    competitionResults: CompetitionResults,
    context: ProjectBatchContext,
  ): Promise<void> {
    try {
      // Get project details for report metadata
      const project = await this.projectService.findById(context.projectId);
      if (!project) {
        throw new Error(`Project ${context.projectId} not found`);
      }

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
            visibilityResults,
            sentimentResults,
            alignmentResults,
            competitionResults,
          ),
          promptsExecuted: this.countPromptsExecuted(
            visibilityResults,
            sentimentResults,
            alignmentResults,
            competitionResults,
          ),
          executionContext: {
            batchId: batchExecutionId,
            pipeline: 'brand-report',
            version: '2.0.0',
          },
        },
        explorer: this.reportBuilderService.buildExplorerData(
          visibilityResults,
          sentimentResults,
          alignmentResults,
          competitionResults,
          project.website,
          project.competitorDetails,
        ),
        visibility: this.reportBuilderService.buildVisibilityData(
          visibilityResults,
          project.brandName,
          project.competitors || [],
        ),
        sentiment: this.reportBuilderService.buildSentimentData(sentimentResults),
        alignment: this.reportBuilderService.buildAlignmentData(alignmentResults),
        competition: this.reportBuilderService.buildCompetitionData(
          competitionResults,
          project.brandName,
          project.competitors || [],
        ),
      };

      // Save the report using the new persistence service
      await this.brandReportPersistenceService.saveReport(brandReport);
      this.logger.log(`Successfully saved brand report for project ${context.projectId}`);

      // Mark the batch execution as completed
      await this.batchExecutionService.updateBatchExecutionStatus(batchExecutionId, 'completed');

      // Determine trigger type
      let triggerType: 'manual' | 'cron' | 'new_project' = 'cron';
      if (context.isManualRefresh) {
        triggerType = 'manual';
      } else if (context.isNewProject) {
        triggerType = 'new_project';
      }

      // Emit report completed events
      await this.emitReportCompletedEvents(
        context,
        project,
        batchExecutionId,
        triggerType,
      );
    } catch (error) {
      this.logger.error(`Failed to create full report: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Emit report completed events for all users in the organization
   */
  private async emitReportCompletedEvents(
    context: ProjectBatchContext,
    project: any,
    batchExecutionId: string,
    triggerType: 'manual' | 'cron' | 'new_project',
  ): Promise<void> {
    if (context.organizationId) {
      try {
        const organization = await this.organizationService.findOne(context.organizationId);
        const users = await this.userService.findByOrganizationId(context.organizationId);

        // Emit report completed event for each user in the organization
        for (const user of users) {
          this.eventEmitter.emit(
            'report.completed',
            new ReportCompletedEvent(
              context.projectId,
              project.brandName,
              batchExecutionId, // Use batch execution ID as report ID
              batchExecutionId,
              user.id,
              user.email,
              triggerType,
            ),
          );
        }

        this.logger.log(
          `Emitted report.completed event for ${users.length} users in organization ${context.organizationId}`,
        );
      } catch (error) {
        this.logger.warn(`Failed to emit report.completed event: ${error.message}`);
      }
    }
  }

  /**
   * Get LLM versions from results
   */
  getLlmVersions(results: any[]): Record<string, string> {
    const versions: Record<string, string> = {};

    for (const result of results) {
      if (result.llmModel && !versions[result.llmModel]) {
        versions[result.llmModel] = `${result.llmModel.toLowerCase()}-version`;
      }
    }

    return versions;
  }
}