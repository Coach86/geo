import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
import { SpontaneousResults } from '@/modules/batch/interfaces/batch.interfaces';
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
    private readonly retrievalService: ReportRetrievalService,
    private readonly converterService: ReportConverterService,
    @InjectModel(WeeklyBrandReport.name)
    private weeklyReportModel: Model<WeeklyBrandReportDocument>,
    private readonly userService: UserService,
  ) {}

  async onModuleInit() {
    // Test email rendering if in development mode
    await this.integrationService.testEmailRendering();
  }

  /**
   * Transform raw batch data into a standardized report entity
   *
   * This method takes raw batch data and uses the converterService to transform it
   * into a standardized report entity format.
   */
  private async transformToEntityFormat(
    report: WeeklyBrandReportDocument,
    identityCard: CompanyIdentityCard,
  ): Promise<WeeklyBrandReportEntity> {
    this.logger.debug(`Transforming report ${report.id} for company ${report.companyId}`);

    try {
      // Create a batch report input object from the document with defaults for missing data
      const batchInput: BatchReportInput = {
        companyId: report.companyId,
        weekStart: report.weekStart,
        spontaneous: report.spontaneous || {
          results: [],
          summary: { mentionRate: 0, topMentions: [] },
          webSearchSummary: { usedWebSearch: false, webSearchCount: 0, consultedWebsites: [] },
        },
        sentimentAccuracy: report.sentiment || {
          results: [],
          summary: { overallSentiment: 'neutral', averageAccuracy: 0 },
          webSearchSummary: { usedWebSearch: false, webSearchCount: 0, consultedWebsites: [] },
        },
        comparison: report.comparison || {
          results: [],
          summary: { winRate: 0, keyDifferentiators: [] },
          webSearchSummary: { usedWebSearch: false, webSearchCount: 0, consultedWebsites: [] },
        },
        llmVersions: report.llmVersions || {},
        generatedAt: report.generatedAt || new Date(),
      };

      // Use the converter service to transform the data
      const convertedEntity = this.converterService.convertBatchInputToReportEntity(
        batchInput,
        identityCard,
      );

      // Ensure the ID is preserved
      convertedEntity.id = report.id;

      this.logger.debug(`Successfully transformed report ${report.id}`);
      return convertedEntity;
    } catch (error) {
      this.logger.error(`Error transforming report ${report.id}: ${error.message}`, error.stack);
      throw new Error(`Failed to transform report: ${error.message}`);
    }
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

  typeSafeToneData(toneData: any) {
    return this.transformationService.typeSafeToneData(toneData);
  }

  typeSafeAttributes(attributes: any) {
    return this.transformationService.typeSafeAttributes(attributes);
  }

  formatArenaData(comparisonData: any, competitors: string[] = []) {
    return this.transformationService.formatArenaData(comparisonData, competitors);
  }

  typeSafeArenaData(arenaData: any) {
    return this.transformationService.typeSafeArenaData(arenaData);
  }

  getCompetitorNames(comparison: any, defaultCompetitors?: string[]): string[] {
    return this.transformationService.getCompetitorNames(comparison, defaultCompetitors);
  }

  generateAttributesList(
    sentimentData: any,
    identityCard?: any,
  ): Array<{ name: string; rate: string; alignment: string }> {
    return this.transformationService.generateAttributesList(sentimentData, identityCard);
  }

  // Report retrieval methods
  async getReportById(reportId: string): Promise<WeeklyBrandReportEntity> {
    return this.retrievalService.getReportById(
      reportId,
      this.transformToEntityFormat.bind(this),
      this.integrationService.getCompanyIdentityCard.bind(this.integrationService),
    );
  }

  async getLatestReport(companyId: string): Promise<WeeklyBrandReportEntity> {
    return this.retrievalService.getLatestReport(
      companyId,
      this.transformToEntityFormat.bind(this),
      this.integrationService.getCompanyIdentityCard.bind(this.integrationService),
    );
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
    return this.persistenceService.saveReport(
      report,
      this.transformToEntityFormat.bind(this),
      this.sendReportAccessEmail.bind(this),
    );
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

      // Save using the standard method
      return this.saveReport(reportEntity);
    } catch (error) {
      this.logger.error(`Failed to save report from batch: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Email notification methods
  async sendReportAccessEmail(reportId: string, companyId: string, token: string): Promise<void> {
    try {
      // Get the report to extract date and other information
      const report = await this.weeklyReportModel.findOne({ id: reportId }).exec();
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
      const report = await this.weeklyReportModel.findOne({ id: reportId }).exec();
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
        report.weekStart,
        companyName,
        customSubject,
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
    await this.weeklyReportModel.deleteMany({ companyId }).exec();
    this.logger.log(`Cleaned up weekly reports for deleted company ${companyId}`);
  }
}
