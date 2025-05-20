import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BatchExecutionRepository } from '../repositories/batch-execution.repository';
import { BatchResultRepository } from '../repositories/batch-result.repository';
import { RawResponseRepository } from '../repositories/raw-response.repository';
import pLimit from 'p-limit';
import { IdentityCardService } from '../../identity-card/services/identity-card.service';
import { IdentityCardRepository } from '../../identity-card/repositories/identity-card.repository';
import { PromptService } from '../../prompt/services/prompt.service';
import { PromptSetRepository } from '../../prompt/repositories/prompt-set.repository';
import { LlmService } from '../../llm/services/llm.service';
import { ReportService } from '../../report/services/report.service';
import { BatchReportInput } from '../../report/interfaces/report-input.interfaces';
import { RawResponseService } from './raw-response.service';
import { SpontaneousPipelineService } from './spontaneous-pipeline.service';
import { SentimentPipelineService } from './sentiment-pipeline.service';
import { AccuracyPipelineService } from './accuracy-pipeline.service';
import { ComparisonPipelineService } from './comparison-pipeline.service';
import { BatchExecutionService } from './batch-execution.service';
import { CompanyBatchContext } from '../interfaces/batch.interfaces';
import { CompanyIdentityCard } from '../../identity-card/entities/company-identity-card.entity';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);
  private readonly limiter: ReturnType<typeof pLimit>;
  private readonly batchEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly identityCardRepository: IdentityCardRepository,
    private readonly promptSetRepository: PromptSetRepository,
    private readonly batchExecutionRepository: BatchExecutionRepository,
    private readonly batchResultRepository: BatchResultRepository,
    private readonly rawResponseRepository: RawResponseRepository,
    private readonly reportService: ReportService,
    private readonly batchExecutionService: BatchExecutionService,
    private readonly spontaneousPipelineService: SpontaneousPipelineService,
    private readonly sentimentPipelineService: SentimentPipelineService,
    private readonly accuracyPipelineService: AccuracyPipelineService,
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
      const companies = await this.identityCardRepository.findAll();

      // Get all prompt sets
      const promptSets = await this.promptSetRepository.findAll();

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
              keyBrandAttributes: company.keyBrandAttributes,
              competitors: company.competitors,
              promptSet,
              websiteUrl: company.website,
              market: company.market,
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
      this.logger.log(
        `Processing company ${companyId} with batchExecutionId: ${batchExecutionId || 'none'}`,
      );

      // Get the company data with context
      const company = await this.getCompanyBatchContext(companyId);

      if (!company) {
        throw new Error(`Company ${companyId} not found`);
      }

      // Current week's start date (Monday 00:00:00 UTC)
      const weekStart = this.getCurrentWeekStart();

      // Add batchExecutionId to context if provided
      const contextWithBatchId = batchExecutionId ? { ...company, batchExecutionId } : company;

      // Log the context to debug
      this.logger.log(
        `Processing company context: ${JSON.stringify({
          companyId: contextWithBatchId.companyId,
          brandName: contextWithBatchId.brandName,
          batchExecutionId: contextWithBatchId.batchExecutionId || 'none',
        })}`,
      );

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
    pipelineType: 'spontaneous' | 'sentiment' | 'accuracy' | 'comparison',
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
        case 'accuracy':
          result = await this.accuracyPipelineService.run(context);
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
   * Run the accuracy pipeline for a company
   * @param context Company batch context
   * @returns Pipeline results
   */
  async runAccuracyPipeline(context: CompanyBatchContext) {
    return this.runPipeline('accuracy', context);
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
      // Use the batch execution ID from the context if it exists, otherwise create a new one
      let batchExecutionId: string;

      if (context.batchExecutionId) {
        batchExecutionId = context.batchExecutionId;
        this.logger.log(
          `Using existing batch execution ${batchExecutionId} for company ${context.companyId}`,
        );
      } else {
        // Create a new batch execution only if one wasn't provided
        const batchExecution = await this.batchExecutionService.createBatchExecution(
          context.companyId,
        );
        batchExecutionId = batchExecution.id;
        this.logger.log(
          `Created batch execution ${batchExecutionId} for company ${context.companyId}`,
        );
      }

      // Inject the batchExecutionId into the context
      const contextWithBatchExecId = { ...context, batchExecutionId };

      // Run all four pipelines in parallel
      const [spontaneousResults, sentimentResults, accuracyResults, comparisonResults] =
        await Promise.all([
          this.spontaneousPipelineService.run(contextWithBatchExecId),
          this.sentimentPipelineService.run(contextWithBatchExecId),
          this.accuracyPipelineService.run(contextWithBatchExecId),
          this.comparisonPipelineService.run(contextWithBatchExecId),
        ]);

      // Get LLM versions
      const llmVersions = this.getLlmVersions([
        ...spontaneousResults.results,
        ...sentimentResults.results,
        ...accuracyResults.results,
        ...comparisonResults.results,
      ]);

      this.logger.log(`Saving batch results for execution ${batchExecutionId}`);

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

      // Create the weekly report with proper typing including the new accuracy results
      const batchReportInput: BatchReportInput = {
        companyId: context.companyId,
        weekStart,
        spontaneous: spontaneousResults,
        sentiment: sentimentResults,
        accord: accuracyResults,
        comparison: comparisonResults,
        llmVersions,
        generatedAt: new Date(),
        batchExecutionId: batchExecutionId,
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
          accuracy: accuracyResults,
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
   * Get running batch executions for a company
   * @param companyId The ID of the company
   * @returns Array of running batch executions sorted by executedAt (newest first)
   */
  async getRunningBatchExecutionsByCompany(companyId: string): Promise<any[]> {
    try {
      return await this.batchExecutionRepository.findByCompanyIdAndStatus(companyId, 'running');
    } catch (error) {
      this.logger.error(`Failed to get running batch executions: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Get company batch context by ID
   * @param companyId The ID of the company
   * @returns The company batch context
   */
  async getCompanyBatchContext(companyId: string): Promise<CompanyBatchContext | null> {
    const company = await this.identityCardRepository.findById(companyId);

    if (!company) {
      return null;
    }

    // Get the prompt set for this company
    const promptSet = await this.promptSetRepository.findByCompanyId(companyId);

    if (!promptSet) {
      throw new Error(`Company ${companyId} has no prompt sets`);
    }

    return {
      companyId: company.id,
      brandName: company.brandName,
      keyBrandAttributes: company.keyBrandAttributes,
      competitors: company.competitors,
      market: company.market,
      promptSet,
      websiteUrl: company.website,
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

        if (result.results.accuracy) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'accuracy',
            result.results.accuracy,
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
        errorMessage,
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
    pipelineType: 'spontaneous' | 'sentiment' | 'accuracy' | 'comparison',
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
    pipelineType: 'spontaneous' | 'sentiment' | 'accuracy' | 'comparison',
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

  /**
   * Get all companies in the system
   * @returns Array of company data
   */
  async getAllCompanies(): Promise<any[]> {
    try {
      this.logger.log('Getting all companies for batch processing');
      
      // Use the identity card repository to get all companies
      const identityCards = await this.identityCardRepository.findAll();
      
      // Map to the format expected by the orchestrator
      return identityCards.map(card => this.identityCardRepository.mapToEntity(card));
    } catch (error) {
      this.logger.error(`Failed to get all companies: ${error.message}`, error.stack);
      throw error;
    }
  }

  @OnEvent('company.deleted')
  async handleCompanyDeleted(event: { companyId: string }) {
    const { companyId } = event;
    // Delete all batch executions for this company
    await this.batchExecutionRepository.deleteByCompanyId(companyId);
    
    // Get execution IDs before deletion to clean up related data
    const batchExecutions = await this.batchExecutionRepository.findByCompanyId(companyId);
    const batchExecutionIds = batchExecutions.map((be) => be.id);
    
    if (batchExecutionIds.length > 0) {
      // Delete related raw responses and batch results
      for (const execId of batchExecutionIds) {
        await this.rawResponseRepository.deleteByExecutionId(execId);
        await this.batchResultRepository.deleteByExecutionId(execId);
      }
    }
    // Optionally, log the cleanup
    this.logger.log(`Cleaned up batch data for deleted company ${companyId}`);
  }
}
