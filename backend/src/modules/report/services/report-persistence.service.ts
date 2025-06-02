import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WeeklyBrandReportEntity } from '../interfaces/report-types';
import { WeeklyBrandReportRepository } from '../repositories/weekly-brand-report.repository';
import { TokenService } from '@/modules/auth/services/token.service';
import { Project } from '@/modules/project/entities/project.entity';
import { ProjectService } from '@/modules/project/services/project.service';
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
    private readonly projectService: ProjectService,
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
        projectId: report.projectId,
        generatedAt: report.generatedAt || new Date(),
        date: report.date,
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

      // Get project for email and transformation
      const project = await this.projectService.findById(report.projectId);
      if (!project) {
        throw new NotFoundException(`Project not found for report ${report.id}`);
      }

      // Generate an access token and send email notification
      const reportDate = saved.date;
      const user = await this.userService.findOne(project.userId);
      const recipientEmail = user.email;
      const companyName = project.brandName || report.projectId;

      const token = await this.tokenService.generateAccessToken(project.userId);
      await this.reportAccessService.sendReportAccessEmail(
        saved.id,
        token,
        reportDate,
        recipientEmail,
        companyName,
      );

      // Return the formatted entity
      return this.converterService.convertDocumentToEntity(saved, project);
    } catch (error) {
      this.logger.error(`Failed to save report: ${error.message}`, error.stack);
      throw new Error(`Failed to save report: ${error.message}`);
    }
  }
}
