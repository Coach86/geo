import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BatchService } from './batch.service';
import { BatchExecutionService } from './batch-execution.service';
import { ReportService } from '../../report/services/report.service';
import { CompanyBatchContext } from '../interfaces/batch.interfaces';

/**
 * Service to orchestrate the execution of all batches for a company
 * and create a report entry after all batches are complete
 */
@Injectable()
export class CompanyBatchOrchestratorService {
  private readonly logger = new Logger(CompanyBatchOrchestratorService.name);

  constructor(
    private readonly configService: ConfigService,
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
        throw new Error(`Company ${companyId} not found or has insufficient data for batch processing`);
      }

      // Get the current week's start date
      const weekStart = this.getCurrentWeekStart();

      // Process the company and create a report
      return await this.orchestrateCompanyBatchesInternal(companyContext, weekStart);
    } catch (error) {
      this.logger.error(`Failed to orchestrate batches for company ${companyId}: ${error.message}`, error.stack);
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
   * @param weekStart The start of the week
   * @returns Result of the orchestration process
   */
  private async orchestrateCompanyBatchesInternal(context: CompanyBatchContext, weekStart: Date) {
    this.logger.log(`Processing batches for company ${context.companyId} (${context.brandName})`);

    try {
      // Create a new batch execution
      const batchExecution = await this.batchExecutionService.createBatchExecution(context.companyId);
      const batchExecutionId = batchExecution.id;

      this.logger.log(`Created batch execution ${batchExecutionId} for company ${context.companyId}`);

      // Inject the batchExecutionId into the context
      const contextWithBatchExecId = { ...context, batchExecutionId };

      // Run the three pipelines in parallel using the pipeline services via batch service
      const [spontaneousResults, sentimentResults, comparisonResults] = await Promise.all([
        this.batchService.runSpontaneousPipeline(contextWithBatchExecId),
        this.batchService.runSentimentPipeline(contextWithBatchExecId),
        this.batchService.runComparisonPipeline(contextWithBatchExecId),
      ]);

      // Get LLM versions
      const llmVersions = this.getLlmVersions([
        ...spontaneousResults.results,
        ...sentimentResults.results,
        ...comparisonResults.results,
      ]);

      // Save each result to batch_results table
      await Promise.all([
        this.batchExecutionService.saveBatchResult(
          batchExecutionId,
          'spontaneous',
          spontaneousResults
        ),
        this.batchExecutionService.saveBatchResult(
          batchExecutionId,
          'sentiment',
          sentimentResults
        ),
        this.batchExecutionService.saveBatchResult(
          batchExecutionId,
          'comparison',
          comparisonResults
        )
      ]);

      // Create the weekly report
      const report = {
        companyId: context.companyId,
        weekStart,
        spontaneous: spontaneousResults,
        sentimentAccuracy: sentimentResults,
        comparison: comparisonResults,
        llmVersions,
        generatedAt: new Date(),
      };

      // Save the report - this will also trigger email sending
      const savedReport = await this.reportService.saveReport(report as any);

      // Mark the batch execution as completed
      await this.batchExecutionService.updateBatchExecutionStatus(batchExecutionId, 'completed');

      this.logger.log(`Successfully processed company ${context.companyId} and created report ${savedReport.id}`);

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
          'failed'
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
      // Get all companies using the identity card model (available through batch service)
      const companies = await this.batchService['identityCardModel'].find().lean().exec();
      
      this.logger.log(`Found ${companies.length} companies to process`);

      const results = [];

      // Process each company sequentially (to avoid overloading the system)
      for (const company of companies) {
        try {
          const result = await this.orchestrateCompanyBatches(company.id);
          results.push(result);
        } catch (error) {
          this.logger.error(`Failed to process company ${company.id}: ${error.message}`, error.stack);
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
   * Get the current week's start date (Monday 00:00:00 UTC)
   * @returns The start date of the current week
   */
  private getCurrentWeekStart(): Date {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Sunday

    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);

    return monday;
  }

  /**
   * Extract LLM versions from results
   * @param results The results to extract LLM versions from
   * @returns A record of LLM provider to version
   */
  private getLlmVersions(results: any[]): Record<string, string> {
    const versions: Record<string, string> = {};

    for (const result of results) {
      if (result.llmProvider && !versions[result.llmProvider]) {
        versions[result.llmProvider] = `${result.llmProvider.toLowerCase()}-version`;
      }
    }

    return versions;
  }
}