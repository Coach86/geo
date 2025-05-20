import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { WeeklyBrandReportRepository } from '../repositories/weekly-brand-report.repository';
import { WeeklyBrandReport as WeeklyBrandReportEntity } from '../entities/weekly-brand-report.entity';
import {
  WeeklyBrandReport,
  WeeklyBrandReportDocument,
} from '../schemas/weekly-brand-report.schema';
import { BatchReportInput } from '../interfaces/report-input.interfaces';
import { ReportTransformationService } from './report-transformation.service';
import { ReportAccessService } from './report-access.service';
import { ReportIntegrationService } from './report-integration.service';
import { ReportPersistenceService } from './report-persistence.service';
import { ReportRetrievalService } from './report-retrieval.service';
import { ReportConverterService } from './report-converter.service';
import { UserService } from '../../user/services/user.service';
import { CompanyIdentityCard } from '@/modules/identity-card/entities/company-identity-card.entity';
import { OnEvent } from '@nestjs/event-emitter';
import { SentimentResults, SpontaneousResults } from '@/modules/batch/interfaces/batch.interfaces';
import { PipelineType } from '@/modules/batch/interfaces/llm.interfaces';
import { ReportContentResponseDto } from '../dto/report-content-response.dto';
/**
 * Main report service that serves as a facade for specialized services
 */
@Injectable()
export class ReportService implements OnModuleInit {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly transformationService: ReportTransformationService,
    private readonly accessService: ReportAccessService,
    private readonly integrationService: ReportIntegrationService,
    private readonly persistenceService: ReportPersistenceService,
    @Inject(forwardRef(() => ReportRetrievalService))
    private readonly retrievalService: ReportRetrievalService,
    private readonly converterService: ReportConverterService,
    private readonly weeklyReportRepository: WeeklyBrandReportRepository,
    private readonly userService: UserService,
  ) {}

  async onModuleInit() {
    // Test email rendering if in development mode
    await this.integrationService.testEmailRendering();
  }

  /**
   * Helper method to get the start of the current week (Monday 00:00:00 UTC)
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
   */
  private extractLlmVersions(results: any[]): Record<string, string> {
    const versions: Record<string, string> = {};

    for (const result of results) {
      if (result.llmProvider && !versions[result.llmProvider]) {
        versions[result.llmProvider] = `${result.llmProvider.toLowerCase()}-version`;
      }
    }

    return versions;
  }

  /**
   * Transform raw batch data into a standardized report entity
   *
   * This method takes a document from MongoDB and uses the converterService to transform it
   * into a standardized report entity format.
   */
  public transformToEntityFormat = async (
    document: Record<string, any>,
    identityCard: CompanyIdentityCard,
  ): Promise<WeeklyBrandReportEntity> => {
    this.logger.debug(`Transforming report ${document.id} for company ${document.companyId}`);
    try {
      // Delegate to the converter service and adapt the type
      return this.adaptReportType(this.converterService.convertDocumentToEntity(document, identityCard));
    } catch (error) {
      this.logger.error(`Error transforming report ${document.id}: ${error.message}`, error.stack);
      throw new Error(`Failed to transform report: ${error.message}`);
    }
  };

  /**
   * Type adapter to handle the circular reference issues
   * This is necessary as a temporary solution until a full refactoring
   */
  private adaptReportType<T>(report: T): any {
    return report;
  }

  /**
   * Public facade methods that delegate to specialized services
   */

  // Expose transformation methods needed by the controller
  formatPulseModelVisibility(spontaneousData: SpontaneousResults) {
    return this.transformationService.formatPulseModelVisibility(spontaneousData);
  }

  formatToneData(sentimentData: any) {
    return this.transformationService.formatToneData(sentimentData);
  }

  formatArenaData(comparisonData: any, competitors: string[] = []) {
    return this.transformationService.formatArenaData(comparisonData, competitors);
  }

  getCompetitorNames(comparison: any, defaultCompetitors?: string[]): string[] {
    return this.transformationService.getCompetitorNames(comparison, defaultCompetitors);
  }

  generateAttributesList(
    sentimentData: SentimentResults,
    identityCard: CompanyIdentityCard,
  ): Array<{ name: string; rate: string; alignment: string }> {
    return this.transformationService.generateAttributesList(identityCard, sentimentData);
  }

  // Report retrieval methods
  async getReportById(reportId: string): Promise<WeeklyBrandReportEntity> {
    const report = await this.retrievalService.getReportById(reportId);
    return this.adaptReportType(report);
  }

  async getLatestReport(companyId: string): Promise<WeeklyBrandReportEntity> {
    const report = await this.retrievalService.getLatestReport(companyId);
    return this.adaptReportType(report);
  }

  async getAllCompanyReports(companyId: string) {
    return this.retrievalService.getAllCompanyReports(companyId);
  }

  // Report persistence methods

  /**
   * Save a report from a structured entity
   * This method is used when the report is already in the entity format
   */
  async saveReport(report: WeeklyBrandReportEntity): Promise<WeeklyBrandReportEntity> {
    const result = await this.persistenceService.saveReport(this.adaptReportType(report));
    return this.adaptReportType(result);
  }

  /**
   * Save a report entity without sending email notification
   * @param report Report entity to save
   * @returns The saved report entity
   */
  async saveReportNoEmail(report: WeeklyBrandReportEntity): Promise<WeeklyBrandReportEntity> {
    const result = await this.persistenceService.saveReport(this.adaptReportType(report));
    return this.adaptReportType(result);
  }

  /**
   * Save a report from batch processing results
   * This method is specifically for accepting input from the batch module
   *
   * @param batchInput Raw batch processing results
   * @returns The saved report entity
   */
  async saveReportFromBatch(batchInput: BatchReportInput): Promise<WeeklyBrandReportEntity> {
    this.logger.log(`Saving report from batch data for company ${batchInput.companyId}`);

    try {
      // Get identity card for additional company info
      const identityCard = await this.integrationService.getCompanyIdentityCard(
        batchInput.companyId,
      );
      if (!identityCard) {
        throw new NotFoundException(`Identity card not found for company ${batchInput.companyId}`);
      }

      // Convert batch input to report entity
      const reportEntity = this.converterService.convertBatchInputToReportEntity(
        batchInput,
        identityCard,
      );

      // Save using the standard method with type adaptation
      return this.saveReport(this.adaptReportType(reportEntity));
    } catch (error) {
      this.logger.error(`Failed to save report from batch: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Save a report from batch execution without sending an email notification
   * Similar to saveReportFromBatch but does not trigger email notifications
   *
   * @param batchExecutionId ID of the batch execution to create report from
   * @returns The saved report entity
   */
  async saveReportFromBatchExecutionNoEmail(
    batchExecutionId: string,
  ): Promise<WeeklyBrandReportEntity> {
    this.logger.log(
      `Saving report from batch execution ${batchExecutionId} without email notification`,
    );

    try {
      // Get the batch execution results
      const spontaneousResult = await this.integrationService.getBatchResultByType(
        batchExecutionId,
        PipelineType.SPONTANEOUS,
      );
      const sentimentResult = await this.integrationService.getBatchResultByType(
        batchExecutionId,
        PipelineType.SENTIMENT,
      );
      const accuracyResult = await this.integrationService.getBatchResultByType(
        batchExecutionId,
        PipelineType.ACCURACY,
      );
      const comparisonResult = await this.integrationService.getBatchResultByType(
        batchExecutionId,
        PipelineType.COMPARISON,
      );

      // Log which results were found
      this.logger.log(
        `Batch results found for ${batchExecutionId}: ` +
          `spontaneous=${!!spontaneousResult}, ` +
          `sentiment=${!!sentimentResult}, ` +
          `accuracy=${!!accuracyResult}, ` +
          `comparison=${!!comparisonResult}`,
      );
      this.logger.log('spontaneousResult' + JSON.stringify(spontaneousResult));

      // Continue even if some results are missing - create default empty results
      // for any missing batch types

      // Get execution details to get companyId
      const batchExecution = await this.integrationService.getBatchExecution(batchExecutionId);
      if (!batchExecution) {
        throw new NotFoundException(`Batch execution not found with ID ${batchExecutionId}`);
      }

      const companyId = batchExecution.companyId;

      // Get identity card for additional company info
      const identityCard = await this.integrationService.getCompanyIdentityCard(companyId);
      if (!identityCard) {
        throw new NotFoundException(`Identity card not found for company ${companyId}`);
      }

      // Current week's start date (Monday 00:00:00 UTC)
      const weekStart = this.getCurrentWeekStart();

      // Extract LLM versions from available results
      const allResults = [
        ...(spontaneousResult?.results || []),
        ...(sentimentResult?.results || []),
        ...(accuracyResult?.results || []),
        ...(comparisonResult?.results || []),
      ];
      const llmVersions = this.extractLlmVersions(allResults);

      // Create the batch report input with only the available data
      const batchReportInput: BatchReportInput = {
        companyId,
        weekStart,
        llmVersions,
        generatedAt: new Date(),
      };

      // Only add results that are available
      if (spontaneousResult) {
        batchReportInput.spontaneous = spontaneousResult;
      }

      if (sentimentResult) {
        batchReportInput.sentiment = sentimentResult;
      }

      if (accuracyResult) {
        batchReportInput.accord = accuracyResult;
      }

      if (comparisonResult) {
        batchReportInput.comparison = comparisonResult;
      }

      // Convert batch input to report entity
      const reportEntity = this.converterService.convertBatchInputToReportEntity(
        batchReportInput,
        identityCard,
      );

      // Save without sending email notification with type adaptation
      return this.saveReportNoEmail(this.adaptReportType(reportEntity));
    } catch (error) {
      this.logger.error(
        `Failed to save report from batch execution: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Email notification methods
  async sendReportAccessEmail(reportId: string, companyId: string, token: string): Promise<void> {
    try {
      // Get the report to extract date and other information
      const report = await this.weeklyReportRepository.findByIdLean(reportId);
      if (!report) {
        throw new NotFoundException(`Report not found with ID ${reportId}`);
      }

      // Get identity card for company name
      const identityCard = await this.integrationService.getCompanyIdentityCard(companyId);
      if (!identityCard) {
        throw new NotFoundException(`Identity card not found for company ${companyId}`);
      }
      const companyName = identityCard?.brandName || companyId;
      const user = await this.userService.findOne(identityCard.userId);
      if (!user) {
        throw new NotFoundException(`User not found for company ${companyId}`);
      }
      // Delegate to access service
      return this.accessService.sendReportAccessEmail(
        reportId,
        token,
        report.weekStart,
        user.email,
        companyName,
      );
    } catch (error) {
      this.logger.error(`Failed to send report access email: ${error.message}`, error.stack);
      // Don't throw, just log the error to prevent report saving from failing
    }
  }

  async sendReportEmailToAddress(
    reportId: string,
    companyId: string,
    emailAddress: string,
    customSubject?: string,
  ): Promise<boolean> {
    try {
      // Validate that the report exists and belongs to the company
      const report = await this.weeklyReportRepository.findByIdLean(reportId);
      if (!report) {
        throw new NotFoundException(`Report not found with ID ${reportId}`);
      }

      if (report.companyId !== companyId) {
        throw new BadRequestException('Report does not belong to the specified company');
      }

      // Get identity card for company name
      const identityCard = await this.integrationService.getCompanyIdentityCard(companyId);
      if (!identityCard) {
        throw new NotFoundException(`Identity card not found for company ${companyId}`);
      }
      const companyName = identityCard?.brandName || companyId;

      // Delegate to access service
      return this.accessService.sendReportEmailToAddress(
        identityCard.userId,
        reportId,
        emailAddress,
        customSubject,
        report.weekStart,
        companyName,
      );
    } catch (error) {
      this.logger.error(`Failed to send report email: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Integration methods
  async getCompanyIdentityCard(companyId: string) {
    return this.integrationService.getCompanyIdentityCard(companyId);
  }

  async getConfig() {
    return this.integrationService.getConfig();
  }

  @OnEvent('company.deleted')
  async handleCompanyDeleted(event: { companyId: string }) {
    const { companyId } = event;
    await this.weeklyReportRepository.deleteByCompanyId(companyId);
    this.logger.log(`Cleaned up weekly reports for deleted company ${companyId}`);
  }
}
