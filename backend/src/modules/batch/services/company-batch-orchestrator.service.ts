import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BatchService } from './batch.service';
import { BatchExecutionService } from './batch-execution.service';
import { ReportService } from '../../report/services/report.service';
import { BatchReportInput } from '../../report/interfaces/report-input.interfaces';
import {
  AccuracyPipelineResult,
  AccuracyResults,
  CompanyBatchContext,
  ComparisonResults,
  SentimentPipelineResult,
  SentimentResults,
  SpontaneousPipelineResult,
  SpontaneousResults,
  WeeklyBrandReport,
} from '../interfaces/batch.interfaces';

/**
 * Service to orchestrate the execution of all batches for a company
 * and create a report entry after all batches are complete
 */
@Injectable()
export class CompanyBatchOrchestratorService {
  private readonly logger = new Logger(CompanyBatchOrchestratorService.name);

  constructor(
    private readonly batchService: BatchService,
    private readonly batchExecutionService: BatchExecutionService,
    private readonly reportService: ReportService,
  ) {
    this.logger.log('CompanyBatchOrchestratorService initialized');
  }

  /**
   * Trigger all batches for a company and create a report
   * @param companyId The ID of the company to process
   * @returns Result of the orchestration process
   */
  async orchestrateCompanyBatches(companyId: string) {
    this.logger.log(`Orchestrating batches for company ${companyId}`);

    try {
      // Get the company context
      const companyContext = await this.batchService.getCompanyBatchContext(companyId);

      if (!companyContext) {
        throw new Error(
          `Company ${companyId} not found or has insufficient data for batch processing`,
        );
      }

      // Get the current week's start date
      const date = new Date();

      // Process the company and create a report
      return await this.orchestrateCompanyBatchesInternal(companyContext, date);
    } catch (error) {
      this.logger.error(
        `Failed to orchestrate batches for company ${companyId}: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        companyId,
        error: error.message,
      };
    }
  }

  /**
   * Internal method to orchestrate batches for a company
   * @param context The company batch context
   * @param date The start of the week
   * @returns Result of the orchestration process
   */
  private async orchestrateCompanyBatchesInternal(context: CompanyBatchContext, date: Date) {
    this.logger.log(`Processing batches for company ${context.companyId} (${context.brandName})`);

    try {
      // Create a new batch execution
      const batchExecution = await this.batchExecutionService.createBatchExecution(
        context.companyId,
      );
      const batchExecutionId = batchExecution.id;

      this.logger.log(
        `Created batch execution ${batchExecutionId} for company ${context.companyId}`,
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
        companyId: context.companyId,
        date,
        spontaneous: spontaneousResults,
        sentiment: sentimentResults,
        accord: accuracyResults,
        comparison: comparisonResults,
        llmVersions,
        generatedAt: new Date(),
      };

      // Save the report using the correct type and method
      const savedReport = await this.reportService.saveReportFromBatch(report);

      // Mark the batch execution as completed
      await this.batchExecutionService.updateBatchExecutionStatus(batchExecutionId, 'completed');

      this.logger.log(
        `Successfully processed company ${context.companyId} and created report ${savedReport.id}`,
      );

      return {
        success: true,
        companyId: context.companyId,
        batchExecutionId,
        reportId: savedReport.id,
        message: `Successfully processed company ${context.companyId} (${context.brandName}) and created report`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process company ${context.companyId}: ${error.message}`,
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
   * Orchestrate all companies' batches
   * @returns Results of the orchestration process for all companies
   */
  async orchestrateAllCompanyBatches() {
    this.logger.log('Orchestrating batches for all companies');

    try {
      // Get all companies from the batch service
      const companies = await this.batchService.getAllCompanies();

      this.logger.log(`Found ${companies.length} companies to process`);

      const results = [];

      // Process each company sequentially (to avoid overloading the system)
      for (const company of companies) {
        try {
          const result = await this.orchestrateCompanyBatches(company.id);
          results.push(result);
        } catch (error) {
          this.logger.error(
            `Failed to process company ${company.id}: ${error.message}`,
            error.stack,
          );
          results.push({
            success: false,
            companyId: company.id,
            error: error.message,
          });
        }
      }

      // Summarize results
      const successful = results.filter((r) => r.success).length;
      const failed = results.length - successful;

      this.logger.log(
        `Batch orchestration completed. Successfully processed ${successful} companies. Failed: ${failed}`,
      );

      return {
        totalCompanies: results.length,
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
