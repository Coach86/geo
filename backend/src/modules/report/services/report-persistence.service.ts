import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WeeklyBrandReportEntity } from '../interfaces/report-types';
import { WeeklyBrandReportRepository } from '../repositories/weekly-brand-report.repository';
import { TokenService } from '@/modules/auth/services/token.service';
import { CompanyIdentityCard } from '@/modules/identity-card/entities/company-identity-card.entity';
import { IdentityCardService } from '@/modules/identity-card/services/identity-card.service';
import { ReportConverterService } from './report-converter.service';
import { ReportAccessService } from './report-access.service';
import { UserService } from '../../user/services/user.service';
/**
 * Service responsible for saving and persisting report data
 */
@Injectable()
export class ReportPersistenceService {
  private readonly logger = new Logger(ReportPersistenceService.name);

  constructor(
    private readonly weeklyReportRepository: WeeklyBrandReportRepository,
    private readonly tokenService: TokenService,
    private readonly identityCardService: IdentityCardService,
    private readonly converterService: ReportConverterService,
    private readonly reportAccessService: ReportAccessService,
    private readonly userService: UserService,
  ) {}

  /**
   * Save a report with the new structure
   */
  async saveReport(report: WeeklyBrandReportEntity): Promise<WeeklyBrandReportEntity> {
    try {
      // Prepare the report data for MongoDB
      const reportData = {
        companyId: report.companyId,
        generatedAt: report.generatedAt || new Date(),
        weekStart: report.weekStart,
        batchExecutionId: report.batchExecutionId,
        // New structure fields
        brand: report.brand,
        metadata: report.metadata,
        kpi: report.kpi,
        pulse: report.pulse,
        tone: report.tone,
        accord: report.accord,
        arena: report.arena,
        brandBattle: report.brandBattle,
        llmVersions: report.llmVersions || {},
        trace: report.trace,
        // Legacy raw data fields for backward compatibility
        spontaneous: report.rawData?.spontaneous,
        sentiment: report.rawData?.sentiment,
        comparison: report.rawData?.comparison,
      };

      // Create the report document
      const saved = await this.weeklyReportRepository.create(reportData);

      // Get company for email and transformation
      const company = await this.identityCardService.findById(report.companyId);
      if (!company) {
        throw new NotFoundException(`Company not found for report ${report.id}`);
      }

      // Generate an access token and send email notification
      const reportDate = saved.weekStart;
      const user = await this.userService.findOne(company.userId);
      const recipientEmail = user.email;
      const companyName = company.brandName || report.companyId;

      const token = await this.tokenService.generateAccessToken(company.userId);
      await this.reportAccessService.sendReportAccessEmail(
        saved.id,
        token,
        reportDate,
        recipientEmail,
        companyName,
      );

      // Return the formatted entity
      return this.converterService.convertDocumentToEntity(saved, company);
    } catch (error) {
      this.logger.error(`Failed to save report: ${error.message}`, error.stack);
      throw new Error(`Failed to save report: ${error.message}`);
    }
  }
}
