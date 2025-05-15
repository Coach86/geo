import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import pLimit from 'p-limit';
import { IdentityCardService } from '../../identity-card/services/identity-card.service';
import {
  IdentityCard,
  IdentityCardDocument,
} from '../../identity-card/schemas/identity-card.schema';
import { PromptService } from '../../prompt/services/prompt.service';
import { PromptSet, PromptSetDocument } from '../../prompt/schemas/prompt-set.schema';
import { LlmService } from '../../llm/services/llm.service';
import { ReportService } from '../../report/services/report.service';
import { BatchReportInput } from '../../report/interfaces/report-input.interfaces';
import { RawResponseService } from '../../report/services/raw-response.service';
import { SpontaneousPipelineService } from './spontaneous-pipeline.service';
import { SentimentPipelineService } from './sentiment-pipeline.service';
import { ComparisonPipelineService } from './comparison-pipeline.service';
import { BatchExecutionService } from './batch-execution.service';
import { CompanyBatchContext } from '../interfaces/batch.interfaces';

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);
  private readonly limiter: ReturnType<typeof pLimit>;
  private readonly batchEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(IdentityCard.name) private identityCardModel: Model<IdentityCardDocument>,
    @InjectModel(PromptSet.name) private promptSetModel: Model<PromptSetDocument>,
    private readonly reportService: ReportService,
    private readonly batchExecutionService: BatchExecutionService,
    private readonly spontaneousPipelineService: SpontaneousPipelineService,
    private readonly sentimentPipelineService: SentimentPipelineService,
    private readonly comparisonPipelineService: ComparisonPipelineService,
  ) {
    // Initialize the concurrency limiter with high parallelism
    // Ensure concurrencyLimit is a number and at least 1
    const configLimit = this.configService.get<string | number>('CONCURRENCY_LIMIT', '30');
    const concurrencyLimit = Math.max(1, parseInt(String(configLimit), 10) || 30);

    this.limiter = pLimit(concurrencyLimit);

    this.logger.log(`Batch service initialized with concurrency limit: ${concurrencyLimit}`);

    // Check if batch processing is enabled
    this.batchEnabled = this.configService.get<boolean>('BATCH_ENABLED', true);

    this.logger.log(
      `Batch service initialized. Batch processing ${this.batchEnabled ? 'enabled' : 'disabled'}`,
    );
  }

  async runBatch() {
    if (!this.batchEnabled) {
      this.logger.log('Batch processing is disabled. Skipping.');
      return;
    }

    try {
      this.logger.log('Starting weekly batch processing');

      // Get all companies with their prompt sets
      const companies = await this.identityCardModel.find().lean().exec();

      // Get all prompt sets
      const promptSets = await this.promptSetModel.find().lean().exec();

      // Create a map of prompt sets by company ID
      const promptSetsByCompany: Record<string, any> = promptSets.reduce(
        (map: Record<string, any>, promptSet) => {
          map[promptSet.companyId] = promptSet;
          return map;
        },
        {},
      );

      this.logger.log(`Found ${companies.length} companies to process`);

      // Current week's start date (Monday 00:00:00 UTC)
      const weekStart = this.getCurrentWeekStart();

      // Process each company
      const promises = companies.map((company) =>
        this.limiter(async () => {
          try {
            const promptSet = promptSetsByCompany[company.id];

            if (!promptSet) {
              this.logger.warn(`Company ${company.id} has no prompt sets. Skipping.`);
              return;
            }

            const context: CompanyBatchContext = {
              companyId: company.id,
              brandName: company.brandName,
              keyFeatures: company.keyFeatures,
              competitors: company.competitors,
              promptSet,
            };

            await this.processCompanyInternal(context, weekStart);

            return { companyId: company.id, success: true };
          } catch (error) {
            this.logger.error(
              `Failed to process company ${company.id}: ${error.message}`,
              error.stack,
            );
            return { companyId: company.id, success: false, error: error.message };
          }
        }),
      );

      const results = await Promise.allSettled(promises);

      // Summarize results
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as any)?.success,
      ).length;
      const failed = results.length - successful;

      this.logger.log(
        `Batch processing completed. Successfully processed ${successful} companies. Failed: ${failed}`,
      );
    } catch (error) {
      this.logger.error(`Batch processing failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Process a specific company by ID
   * @param companyId The ID of the company to process
   * @param batchExecutionId Optional batch execution ID if one was already created
   * @returns Result of the batch processing including the batch execution ID
   */
  async processCompany(companyId: string, batchExecutionId?: string) {
    try {
      // Get the company data with context
      const company = await this.getCompanyBatchContext(companyId);

      if (!company) {
        throw new Error(`Company ${companyId} not found`);
      }

      // Current week's start date (Monday 00:00:00 UTC)
      const weekStart = this.getCurrentWeekStart();

      // Add batchExecutionId to context if provided
      const contextWithBatchId = batchExecutionId ? { ...company, batchExecutionId } : company;

      // Process the company
      const result = await this.processCompanyInternal(contextWithBatchId, weekStart);

      return {
        success: true,
        companyId: company.companyId,
        batchExecutionId: result.batchExecutionId,
        message: `Successfully processed company ${company.companyId} (${company.brandName})`,
      };
    } catch (error) {
      this.logger.error(`Failed to process company ${companyId}: ${error.message}`, error.stack);
      return {
        success: false,
        companyId,
        error: error.message,
      };
    }
  }

  /**
   * Run a specific pipeline for a company
   * @param pipelineType Type of pipeline to run
   * @param context Company context
   */
  async runPipeline(
    pipelineType: 'spontaneous' | 'sentiment' | 'comparison',
    context: CompanyBatchContext,
  ) {
    this.logger.log(
      `Running ${pipelineType} pipeline for company ${context.companyId} (${context.brandName})`,
    );

    try {
      let result;

      // Run the appropriate pipeline
      switch (pipelineType) {
        case 'spontaneous':
          result = await this.spontaneousPipelineService.run(context);
          break;
        case 'sentiment':
          result = await this.sentimentPipelineService.run(context);
          break;
        case 'comparison':
          result = await this.comparisonPipelineService.run(context);
          break;
        default:
          throw new Error(`Unknown pipeline type: ${pipelineType}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to run ${pipelineType} pipeline for company ${context.companyId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Run the spontaneous pipeline for a company
   * @param context Company batch context
   * @returns Pipeline results
   */
  async runSpontaneousPipeline(context: CompanyBatchContext) {
    return this.runPipeline('spontaneous', context);
  }

  /**
   * Run the sentiment analysis pipeline for a company
   * @param context Company batch context
   * @returns Pipeline results
   */
  async runSentimentPipeline(context: CompanyBatchContext) {
    return this.runPipeline('sentiment', context);
  }

  /**
   * Run the comparison pipeline for a company
   * @param context Company batch context
   * @returns Pipeline results
   */
  async runComparisonPipeline(context: CompanyBatchContext) {
    return this.runPipeline('comparison', context);
  }

  /**
   * Internal method to process a company
   * @param context The company batch context
   * @param weekStart The start of the week
   * @returns Object containing the batch execution ID and results
   */
  private async processCompanyInternal(context: CompanyBatchContext, weekStart: Date) {
    this.logger.log(`Processing company ${context.companyId} (${context.brandName})`);

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

      // Run the three pipelines in parallel
      const [spontaneousResults, sentimentResults, comparisonResults] = await Promise.all([
        this.spontaneousPipelineService.run(contextWithBatchExecId),
        this.sentimentPipelineService.run(contextWithBatchExecId),
        this.comparisonPipelineService.run(contextWithBatchExecId),
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
          spontaneousResults,
        ),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'sentiment', sentimentResults),
        this.batchExecutionService.saveBatchResult(
          batchExecutionId,
          'comparison',
          comparisonResults,
        ),
      ]);

      // Create the weekly report with proper typing
      const batchReportInput: BatchReportInput = {
        companyId: context.companyId,
        weekStart,
        spontaneous: spontaneousResults,
        sentimentAccuracy: sentimentResults,
        comparison: comparisonResults,
        llmVersions,
        generatedAt: new Date(),
      };

      // Save the report using the properly typed method
      await this.reportService.saveReportFromBatch(batchReportInput);

      // Mark the batch execution as completed
      await this.batchExecutionService.updateBatchExecutionStatus(batchExecutionId, 'completed');

      this.logger.log(`Successfully processed company ${context.companyId}`);

      return {
        batchExecutionId,
        results: {
          spontaneous: spontaneousResults,
          sentiment: sentimentResults,
          comparison: comparisonResults,
        },
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

  private getLlmVersions(results: any[]): Record<string, string> {
    const versions: Record<string, string> = {};

    for (const result of results) {
      if (result.llmProvider && !versions[result.llmProvider]) {
        versions[result.llmProvider] = `${result.llmProvider.toLowerCase()}-version`;
      }
    }

    return versions;
  }

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
   * Get company batch context by ID
   * @param companyId The ID of the company
   * @returns The company batch context
   */
  async getCompanyBatchContext(companyId: string): Promise<CompanyBatchContext | null> {
    const company = await this.identityCardModel.findOne({ id: companyId }).exec();

    if (!company) {
      return null;
    }

    // Get the prompt set for this company
    const promptSet = await this.promptSetModel.findOne({ companyId }).exec();

    if (!promptSet) {
      throw new Error(`Company ${companyId} has no prompt sets`);
    }

    return {
      companyId: company.id,
      brandName: company.brandName,
      keyFeatures: company.keyFeatures,
      competitors: company.competitors,
      promptSet,
    };
  }

  /**
   * Create a batch execution record
   * @param companyId The ID of the company
   * @returns The created batch execution
   */
  async createBatchExecution(companyId: string): Promise<any> {
    this.logger.log(`Creating batch execution for company ${companyId}`);

    try {
      return await this.batchExecutionService.createBatchExecution(companyId);
    } catch (error) {
      this.logger.error(`Failed to create batch execution: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Complete a batch execution with results
   * @param batchExecutionId The ID of the batch execution
   * @param result The result of the batch execution
   * @returns The updated batch execution
   */
  async completeBatchExecution(batchExecutionId: string, result: any): Promise<any> {
    this.logger.log(`Completing batch execution ${batchExecutionId}`);

    try {
      // If the result contains results for different pipelines, save them individually
      if (result && result.results) {
        // Check which pipeline results are available
        if (result.results.spontaneous) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'spontaneous',
            result.results.spontaneous,
          );
        }

        if (result.results.sentiment) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'sentiment',
            result.results.sentiment,
          );
        }

        if (result.results.comparison) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'comparison',
            result.results.comparison,
          );
        }
      }

      // Update the batch execution status to completed
      return await this.batchExecutionService.updateBatchExecutionStatus(
        batchExecutionId,
        'completed',
      );
    } catch (error) {
      this.logger.error(`Failed to complete batch execution: ${error.message}`, error.stack);

      // If saving results fails, mark the batch execution as failed
      await this.failBatchExecution(
        batchExecutionId,
        error.message || 'Unknown error during completion',
      );
      throw error;
    }
  }

  /**
   * Mark a batch execution as failed
   * @param batchExecutionId The ID of the batch execution
   * @param errorMessage The error message
   * @returns The updated batch execution
   */
  async failBatchExecution(batchExecutionId: string, errorMessage: string): Promise<any> {
    this.logger.error(`Marking batch execution ${batchExecutionId} as failed: ${errorMessage}`);

    try {
      return await this.batchExecutionService.updateBatchExecutionStatus(
        batchExecutionId,
        'failed',
      );
    } catch (error) {
      this.logger.error(`Failed to mark batch execution as failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a batch execution for a single pipeline run
   * @param companyId The ID of the company
   * @param pipelineType The type of pipeline being run
   * @returns The created batch execution
   */
  async createSinglePipelineBatchExecution(
    companyId: string,
    pipelineType: 'spontaneous' | 'sentiment' | 'comparison',
  ): Promise<any> {
    this.logger.log(
      `Creating batch execution for ${pipelineType} pipeline for company ${companyId}`,
    );

    try {
      // Create a new batch execution using the batch execution service
      const batchExecution = await this.batchExecutionService.createBatchExecution(companyId);

      this.logger.log(`Created batch execution ${batchExecution.id} for ${pipelineType} pipeline`);

      return batchExecution;
    } catch (error) {
      this.logger.error(
        `Failed to create batch execution for ${pipelineType} pipeline: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Save the result of a single pipeline run
   * @param batchExecutionId The ID of the batch execution
   * @param pipelineType The type of pipeline
   * @param result The result to save
   * @returns The saved batch result
   */
  async saveSinglePipelineResult(
    batchExecutionId: string,
    pipelineType: 'spontaneous' | 'sentiment' | 'comparison',
    result: any,
  ): Promise<any> {
    this.logger.log(`Saving ${pipelineType} result for batch execution ${batchExecutionId}`);

    try {
      // Save the result using the batch execution service
      const batchResult = await this.batchExecutionService.saveBatchResult(
        batchExecutionId,
        pipelineType,
        result,
      );

      this.logger.log(`Saved ${pipelineType} result for batch execution ${batchExecutionId}`);

      return batchResult;
    } catch (error) {
      this.logger.error(`Failed to save ${pipelineType} result: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark a single pipeline batch execution as completed
   * @param batchExecutionId The ID of the batch execution
   * @returns The updated batch execution
   */
  async completeSinglePipelineBatchExecution(batchExecutionId: string): Promise<any> {
    this.logger.log(`Marking batch execution ${batchExecutionId} as completed`);

    try {
      // Update the status using the batch execution service
      const batchExecution = await this.batchExecutionService.updateBatchExecutionStatus(
        batchExecutionId,
        'completed',
      );

      this.logger.log(`Marked batch execution ${batchExecutionId} as completed`);

      return batchExecution;
    } catch (error) {
      this.logger.error(
        `Failed to mark batch execution as completed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Mark a single pipeline batch execution as failed
   * @param batchExecutionId The ID of the batch execution
   * @param errorMessage The error message
   * @returns The updated batch execution
   */
  async failSinglePipelineBatchExecution(
    batchExecutionId: string,
    errorMessage: string,
  ): Promise<any> {
    this.logger.error(`Marking batch execution ${batchExecutionId} as failed: ${errorMessage}`);

    try {
      // Update the status using the batch execution service
      const batchExecution = await this.batchExecutionService.updateBatchExecutionStatus(
        batchExecutionId,
        'failed',
      );

      this.logger.log(`Marked batch execution ${batchExecutionId} as failed`);

      return batchExecution;
    } catch (error) {
      this.logger.error(`Failed to mark batch execution as failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
