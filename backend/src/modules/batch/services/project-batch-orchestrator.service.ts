import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BatchService } from './batch.service';
import { BatchExecutionService } from './batch-execution.service';
import { ReportService } from '../../report/services/report.service';
import { BatchReportInput } from '../../report/interfaces/report-input.interfaces';
import {
  AccuracyPipelineResult,
  AccuracyResults,
  ProjectBatchContext,
  ComparisonResults,
  SentimentPipelineResult,
  SentimentResults,
  SpontaneousPipelineResult,
  SpontaneousResults,
  WeeklyBrandReport,
} from '../interfaces/batch.interfaces';

/**
 * Service to orchestrate the execution of all batches for a project
 * and create a report entry after all batches are complete
 */
@Injectable()
export class ProjectBatchOrchestratorService {
  private readonly logger = new Logger(ProjectBatchOrchestratorService.name);

  constructor(
    private readonly batchService: BatchService,
    private readonly batchExecutionService: BatchExecutionService,
    private readonly reportService: ReportService,
  ) {
    this.logger.log('ProjectBatchOrchestratorService initialized');
  }

  /**
   * Trigger all batches for a project and create a report
   * @param projectId The ID of the project to process
   * @returns Result of the orchestration process
   */
  async orchestrateProjectBatches(projectId: string) {
    this.logger.log(`Orchestrating batches for project ${projectId}`);

    try {
      // Get the project context
      const projectContext = await this.batchService.getProjectBatchContext(projectId);

      if (!projectContext) {
        throw new Error(
          `Project ${projectId} not found or has insufficient data for batch processing`,
        );
      }

      // Get the current week's start date
      const date = new Date();

      // Process the project and create a report
      return await this.orchestrateProjectBatchesInternal(projectContext, date);
    } catch (error) {
      this.logger.error(
        `Failed to orchestrate batches for project ${projectId}: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        projectId,
        error: error.message,
      };
    }
  }

  /**
   * Internal method to orchestrate batches for a project
   * @param context The project batch context
   * @param date The start of the week
   * @returns Result of the orchestration process
   */
  private async orchestrateProjectBatchesInternal(context: ProjectBatchContext, date: Date) {
    this.logger.log(`Processing batches for project ${context.projectId} (${context.brandName})`);

    try {
      // Create a new batch execution
      const batchExecution = await this.batchExecutionService.createBatchExecution(
        context.projectId,
      );
      const batchExecutionId = batchExecution.id;

      this.logger.log(
        `Created batch execution ${batchExecutionId} for project ${context.projectId}`,
      );

      // Inject the batchExecutionId into the context
      const contextWithBatchExecId = { ...context, batchExecutionId };

      // Run the four pipelines in parallel using the pipeline services via batch service
      const pipelineResults = await Promise.all([
        this.batchService.runSpontaneousPipeline(contextWithBatchExecId),
        this.batchService.runSentimentPipeline(contextWithBatchExecId),
        this.batchService.runAccuracyPipeline(contextWithBatchExecId),
        this.batchService.runComparisonPipeline(contextWithBatchExecId),
      ]);
      const spontaneousResults = pipelineResults[0] as SpontaneousResults;
      const sentimentResults = pipelineResults[1] as SentimentResults;
      const accuracyResults = pipelineResults[2] as AccuracyResults;
      // The comparison pipeline now only returns ComparisonResults
      const comparisonResults = pipelineResults[3] as ComparisonResults;

      // Get LLM versions
      const llmVersions = this.getLlmVersions([
        ...spontaneousResults.results,
        ...sentimentResults.results,
        ...accuracyResults.results,
        ...comparisonResults.results,
      ]);

      // Save each result to batch_results table
      await Promise.all([
        this.batchExecutionService.saveBatchResult(
          batchExecutionId,
          'spontaneous',
          spontaneousResults,
        ),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'sentiment', sentimentResults),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'accuracy', accuracyResults),
        this.batchExecutionService.saveBatchResult(
          batchExecutionId,
          'comparison',
          comparisonResults,
        ),
      ]);

      // Create the weekly report input for the report module
      const report: BatchReportInput = {
        projectId: context.projectId,
        date,
        spontaneous: spontaneousResults,
        sentiment: sentimentResults,
        accord: accuracyResults,
        comparison: comparisonResults,
        llmVersions,
        generatedAt: new Date(),
        batchExecutionId,
      };

      // Save the report using the correct type and method
      const savedReport = await this.reportService.saveReportFromBatch(report);

      // Mark the batch execution as completed
      await this.batchExecutionService.updateBatchExecutionStatus(batchExecutionId, 'completed');

      this.logger.log(
        `Successfully processed project ${context.projectId} and created report ${savedReport.id}`,
      );

      return {
        success: true,
        projectId: context.projectId,
        batchExecutionId,
        reportId: savedReport.id,
        message: `Successfully processed project ${context.projectId} (${context.brandName}) and created report`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process project ${context.projectId}: ${error.message}`,
        error.stack,
      );

      // If we have a batch execution ID, mark it as failed
      if (context.batchExecutionId) {
        await this.batchExecutionService.updateBatchExecutionStatus(
          context.batchExecutionId,
          'failed',
        );
      }

      throw error;
    }
  }

  /**
   * Orchestrate all projects' batches
   * @returns Results of the orchestration process for all projects
   */
  async orchestrateAllProjectBatches() {
    this.logger.log('Orchestrating batches for all projects');

    try {
      // Get all projects from the batch service
      const projects = await this.batchService.getAllProjects();

      this.logger.log(`Found ${projects.length} projects to process`);

      const results = [];

      // Process each project sequentially (to avoid overloading the system)
      for (const project of projects) {
        try {
          const result = await this.orchestrateProjectBatches(project.id);
          results.push(result);
        } catch (error) {
          this.logger.error(
            `Failed to process project ${project.id}: ${error.message}`,
            error.stack,
          );
          results.push({
            success: false,
            projectId: project.id,
            error: error.message,
          });
        }
      }

      // Summarize results
      const successful = results.filter((r) => r.success).length;
      const failed = results.length - successful;

      this.logger.log(
        `Batch orchestration completed. Successfully processed ${successful} projects. Failed: ${failed}`,
      );

      return {
        totalProjects: results.length,
        successful,
        failed,
        results,
      };
    } catch (error) {
      this.logger.error(`Batch orchestration failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Extract LLM versions from results
   * @param results The results to extract LLM versions from
   * @returns A record of LLM provider to version
   */
  private getLlmVersions(
    results: { llmProvider: string; llmModel: string }[],
  ): Record<string, string> {
    const versions: Record<string, string> = {};

    for (const result of results) {
      if (result.llmProvider && !versions[result.llmProvider]) {
        versions[result.llmProvider] =
          `${result.llmProvider.toLowerCase()}-${result.llmModel?.toLowerCase() || ''}`;
      }
    }

    return versions;
  }
}
