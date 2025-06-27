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
import { CrawlerPipelineService } from '../../crawler/services/crawler-pipeline.service';
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
    private readonly crawlerPipelineService: CrawlerPipelineService,
  ) {}

  /**
   * Orchestrate all projects' batches
   */
  async orchestrateAllProjectBatches() {
    this.logger.log('Orchestrating batches for all projects');

    try {
      // Get all projects from the project service
      const projects = await this.projectService.findAll();
      
      this.logger.log(`Found ${projects.length} projects to process`);

      const results = {
        successful: 0,
        failed: 0,
        details: [] as any[],
      };

      // Process each project sequentially (to avoid overloading the system)
      for (const project of projects) {
        try {
          const result = await this.orchestrateProjectBatches(project.projectId);
          results.successful++;
          results.details.push(result);
        } catch (error) {
          this.logger.error(`Failed to process project ${project.projectId}: ${error.message}`, error.stack);
          results.failed++;
          results.details.push({
            success: false,
            projectId: project.projectId,
            error: error.message,
          });
        }
      }

      this.logger.log(`Completed processing all projects. Successful: ${results.successful}, Failed: ${results.failed}`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to orchestrate all project batches: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Orchestrate the creation of a brand report for a project
   */
  async orchestrateProjectBatches(projectId: string) {
    this.logger.log(`Orchestrating brand report for project ${projectId}`);

    try {
      // Get the project context
      const projectContext = await this.batchService.getProjectBatchContext(projectId);
      if (!projectContext) {
        throw new Error(`Project ${projectId} not found or has insufficient data`);
      }

      // Get project details
      const project = await this.projectService.findById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Create a new batch execution
      const batchExecution = await this.batchExecutionService.createBatchExecution(projectId);
      const batchExecutionId = batchExecution.id;

      // Inject the batchExecutionId into the context
      const contextWithBatchExecId = { ...projectContext, batchExecutionId };

      // Run the four pipelines in parallel
      const pipelineResults = await Promise.all([
        this.batchService.runVisibilityPipeline(contextWithBatchExecId),
        this.batchService.runSentimentPipeline(contextWithBatchExecId),
        this.batchService.runAlignmentPipeline(contextWithBatchExecId),
        this.batchService.runCompetitionPipeline(contextWithBatchExecId),
      ]);

      // Run content KPI pipeline separately (it has its own crawling process)
      let contentKpiResult = null;
      try {
        // Only run if crawling is enabled for the project
        if (project.crawlSettings?.enabled !== false) {
          this.logger.log(`Running content KPI pipeline for project ${projectId}`);
          contentKpiResult = await this.crawlerPipelineService.runContentKPIPipeline(projectId);
        }
      } catch (error) {
        this.logger.error(`Content KPI pipeline failed for project ${projectId}: ${error.message}`, error.stack);
        // Don't fail the entire batch if content KPI fails
      }
      
      const spontaneousResults = pipelineResults[0] as SpontaneousResults;
      const sentimentResults = pipelineResults[1] as SentimentResults;
      const accuracyResults = pipelineResults[2] as AccuracyResults;
      const comparisonResults = pipelineResults[3] as ComparisonResults;
      
      // Debug logging for competition results
      this.logger.log(`[ORCH-001] Received competition results: ${JSON.stringify({
        hasResults: !!comparisonResults,
        resultsCount: comparisonResults?.results?.length || 0,
        hasSummary: !!comparisonResults?.summary,
        competitorAnalysesCount: comparisonResults?.summary?.competitorAnalyses?.length || 0,
        firstResult: comparisonResults?.results?.[0] ? {
          model: comparisonResults.results[0].llmModel,
          competitor: comparisonResults.results[0].competitor,
          hasOriginalPrompt: !!comparisonResults.results[0].originalPrompt,
          hasLlmResponse: !!comparisonResults.results[0].llmResponse,
        } : null
      })}`);
      
      // Extra debug: log raw pipeline result
      if (comparisonResults?.results?.length > 0) {
        this.logger.log(`[ORCH-002] Raw first competition result keys: ${Object.keys(comparisonResults.results[0])}`);
        this.logger.log(`[ORCH-003] Has llmResponse in first result: ${'llmResponse' in comparisonResults.results[0]}`);
        this.logger.log(`[ORCH-004] First result llmResponse length: ${comparisonResults.results[0].llmResponse?.length || 0}`);
      } else {
        this.logger.error(`[ORCH-005] Competition results is empty or undefined! comparisonResults: ${JSON.stringify(comparisonResults)}`);
      }

      // Save batch results
      await Promise.all([
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'visibility', spontaneousResults),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'sentiment', sentimentResults),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'alignment', accuracyResults),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'competition', comparisonResults),
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
          modelsUsed: this.extractModelsUsed(spontaneousResults, sentimentResults, accuracyResults, comparisonResults),
          promptsExecuted: this.countPromptsExecuted(spontaneousResults, sentimentResults, accuracyResults, comparisonResults),
          executionContext: {
            batchId: batchExecutionId,
            pipeline: 'brand-report',
            version: '2.0.0',
          },
        },
        explorer: this.reportBuilderService.buildExplorerData(spontaneousResults, sentimentResults, accuracyResults, comparisonResults, project.website, project.competitorDetails),
        visibility: this.reportBuilderService.buildVisibilityData(spontaneousResults, project.brandName, project.competitors || []),
        sentiment: this.reportBuilderService.buildSentimentData(sentimentResults),
        alignment: this.reportBuilderService.buildAlignmentData(accuracyResults),
        competition: (() => {
          this.logger.log(`[ORCH-006] About to call buildCompetitionData with ${comparisonResults?.results?.length || 0} results`);
          if (comparisonResults?.results?.length > 0) {
            this.logger.log(`[ORCH-007] First result before buildCompetitionData: ${JSON.stringify({
              model: comparisonResults.results[0].llmModel,
              hasLlmResponse: !!comparisonResults.results[0].llmResponse,
              llmResponseLength: comparisonResults.results[0].llmResponse?.length || 0
            })}`);
          }
          return this.reportBuilderService.buildCompetitionData(comparisonResults, project.brandName, project.competitors || []);
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
            this.eventEmitter.emit('report.completed', new ReportCompletedEvent(
              projectId,
              project.brandName,
              batchExecutionId, // Use batch execution ID as report ID
              batchExecutionId,
              user.id,
              user.email,
              'new_project', // Trigger type for post-checkout batch
            ));
          }
          
          this.logger.log(`Emitted report.completed event for ${users.length} users in organization ${projectContext.organizationId}`);
        } catch (error) {
          this.logger.warn(`Failed to emit report.completed event: ${error.message}`);
        }
      }

      this.logger.log(`Successfully created brand report ${savedReport.id} for project ${projectId}`);

      return {
        success: true,
        projectId,
        batchExecutionId,
        reportId: savedReport.id,
        message: `Successfully created brand report for ${project.brandName}`,
      };
    } catch (error) {
      this.logger.error(`Failed to create brand report for project ${projectId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private extractModelsUsed(...results: any[]): string[] {
    const models = new Set<string>();
    results.forEach(result => {
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
    results.forEach(result => {
      if (result?.results) {
        count += result.results.length;
      }
    });
    return count;
  }

}
