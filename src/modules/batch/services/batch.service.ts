import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pLimit from 'p-limit';
import { PrismaService } from '../../../services/prisma.service';
import { IdentityCardService } from '../../identity-card/services/identity-card.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { LlmService } from '../../llm/services/llm.service';
import { ReportService } from '../../report/services/report.service';
import { SpontaneousPipelineService } from './spontaneous-pipeline.service';
import { SentimentPipelineService } from './sentiment-pipeline.service';
import { ComparisonPipelineService } from './comparison-pipeline.service';
import { CompanyBatchContext } from '../interfaces/batch.interfaces';

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);
  private readonly limiter: ReturnType<typeof pLimit>;
  private readonly batchEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly identityCardService: IdentityCardService,
    private readonly llmService: LlmService,
    private readonly reportService: ReportService,
    private readonly spontaneousPipelineService: SpontaneousPipelineService,
    private readonly sentimentPipelineService: SentimentPipelineService,
    private readonly comparisonPipelineService: ComparisonPipelineService,
  ) {
    // Initialize the concurrency limiter
    // Ensure concurrencyLimit is a number and at least 1
    const configLimit = this.configService.get<string | number>('CONCURRENCY_LIMIT', '5');
    const concurrencyLimit = Math.max(1, parseInt(String(configLimit), 10) || 5);

    this.limiter = pLimit(concurrencyLimit);

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

      // Get all companies
      const companies = await this.prisma.identityCard.findMany({
        include: {
          promptSets: true,
        },
      });

      this.logger.log(`Found ${companies.length} companies to process`);

      // Current week's start date (Monday 00:00:00 UTC)
      const weekStart = this.getCurrentWeekStart();

      // Process each company
      const promises = companies.map((company) =>
        this.limiter(async () => {
          try {
            if (!company.promptSets || company.promptSets.length === 0) {
              this.logger.warn(`Company ${company.id} has no prompt sets. Skipping.`);
              return;
            }

            const promptSet = company.promptSets[0];

            const context: CompanyBatchContext = {
              companyId: company.id,
              brandName: company.brandName,
              keyFeatures: JSON.parse(company.keyFeaturesJson || '[]'),
              competitors: JSON.parse(company.competitorsJson || '[]'),
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
   * @returns Result of the batch processing
   */
  async processCompany(companyId: string) {
    try {
      // Get the company data with context
      const company = await this.getCompanyBatchContext(companyId);

      if (!company) {
        throw new Error(`Company ${companyId} not found`);
      }

      // Current week's start date (Monday 00:00:00 UTC)
      const weekStart = this.getCurrentWeekStart();

      // Process the company
      await this.processCompanyInternal(company, weekStart);

      return {
        success: true,
        companyId: company.companyId,
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
   */
  private async processCompanyInternal(context: CompanyBatchContext, weekStart: Date) {
    this.logger.log(`Processing company ${context.companyId} (${context.brandName})`);

    try {
      // Run the three pipelines in parallel
      const [spontaneousResults, sentimentResults, comparisonResults] = await Promise.all([
        this.spontaneousPipelineService.run(context),
        this.sentimentPipelineService.run(context),
        this.comparisonPipelineService.run(context),
      ]);

      // Get LLM versions
      const llmVersions = this.getLlmVersions([
        ...spontaneousResults.results,
        ...sentimentResults.results,
        ...comparisonResults.results,
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

      // Save the report
      await this.reportService.saveReport(report as any);

      this.logger.log(`Successfully processed company ${context.companyId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process company ${context.companyId}: ${error.message}`,
        error.stack,
      );
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
    const company = await this.prisma.identityCard.findUnique({
      where: { id: companyId },
      include: {
        promptSets: true,
      },
    });

    if (!company) {
      return null;
    }

    if (!company.promptSets || company.promptSets.length === 0) {
      throw new Error(`Company ${companyId} has no prompt sets`);
    }

    const promptSet = company.promptSets[0];

    return {
      companyId: company.id,
      brandName: company.brandName,
      keyFeatures: JSON.parse(company.keyFeaturesJson || '[]'),
      competitors: JSON.parse(company.competitorsJson || '[]'),
      promptSet,
    };
  }
}