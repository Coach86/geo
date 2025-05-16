import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WeeklyBrandReport as WeeklyBrandReportEntity } from '../entities/weekly-brand-report.entity';
import {
  WeeklyBrandReport,
  WeeklyBrandReportDocument,
} from '../schemas/weekly-brand-report.schema';
import { TokenService } from '@/modules/auth/services/token.service';
import { CompanyIdentityCard } from '@/modules/identity-card/entities/company-identity-card.entity';
import { IdentityCardService } from '@/modules/identity-card/services/identity-card.service';
/**
 * Service responsible for saving and persisting report data
 */
@Injectable()
export class ReportPersistenceService {
  private readonly logger = new Logger(ReportPersistenceService.name);

  constructor(
    @InjectModel(WeeklyBrandReport.name)
    private weeklyReportModel: Model<WeeklyBrandReportDocument>,
    private readonly tokenService: TokenService,
    private readonly identityCardService: IdentityCardService,
  ) {}

  /**
   * Save a report with the new structure
   */
  async saveReport(
    report: WeeklyBrandReportEntity,
    transformToEntityFormat: (
      report: WeeklyBrandReportDocument,
      identityCard?: CompanyIdentityCard,
    ) => Promise<WeeklyBrandReportEntity>,
    sendReportAccessEmail: (reportId: string, companyId: string, token: string) => Promise<void>,
  ): Promise<WeeklyBrandReportEntity> {
    try {
      // Create new report with both new and legacy structures
      const newReport = new this.weeklyReportModel({
        companyId: report.companyId,
        weekStart: report.weekStart,
        generatedAt: report.generatedAt || new Date(),

        // New structure fields
        brand: report.brand,
        metadata: report.metadata,
        kpi: report.kpi,
        pulse: report.pulse,
        tone: report.tone,
        accord: report.accord,
        arena: report.arena,

        // Legacy fields for backward compatibility
        spontaneous: report.spontaneous || {
          results: [],
          summary: { mentionRate: 0, topMentions: [] },
        },
        sentiment: report.sentimentAccuracy || {
          results: [],
          summary: { overallSentiment: 'neutral', averageAccuracy: 0 },
        },
        comparison: report.comparison || {
          results: [],
          summary: { winRate: 0, keyDifferentiators: [] },
        },
        llmVersions: report.llmVersions || {},
      });

      const saved = await newReport.save();

      const company = await this.identityCardService.findById(report.companyId);
      if (!company) {
        throw new NotFoundException(`Company not found for report ${report.id}`);
      }
      // Generate an access token and send email notification
      const token = await this.tokenService.generateAccessToken(company.userId);
      await sendReportAccessEmail(saved.id, report.companyId, token);

      // Return the saved report in the new entity format
      return transformToEntityFormat(saved);
    } catch (error) {
      this.logger.error(`Failed to save report: ${error.message}`, error.stack);
      throw new Error(`Failed to save report: ${error.message}`);
    }
  }
}
