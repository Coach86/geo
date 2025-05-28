import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { WeeklyBrandReportEntity } from '../interfaces/report-types';
import { IdentityCardService } from '@/modules/identity-card/services/identity-card.service';
import { ReportService } from './report.service';
import { ReportConverterService } from './report-converter.service';
import { WeeklyBrandReportRepository } from '../repositories/weekly-brand-report.repository';

/**
 * Service responsible for retrieving reports from the database
 * Handles fetching and transforming MongoDB documents to entity format
 */
@Injectable()
export class ReportRetrievalService {
  private readonly logger = new Logger(ReportRetrievalService.name);

  constructor(
    @Inject(forwardRef(() => ReportService))
    private readonly reportService: ReportService,
    private readonly identityCardService: IdentityCardService,
    private readonly converterService: ReportConverterService,
    private readonly weeklyReportRepository: WeeklyBrandReportRepository,
  ) {}

  /**
   * Get a report by ID, returning it in entity format
   * @param reportId The unique report ID
   * @returns The report in entity format
   */
  async getReportById(reportId: string): Promise<WeeklyBrandReportEntity> {
    try {
      this.logger.log(`Looking up report with ID ${reportId}`);
      const document = await this.weeklyReportRepository.findByIdLean(reportId);
      if (!document) {
        this.logger.warn(`Report not found with ID ${reportId}`);
        throw new NotFoundException(`Report not found with ID ${reportId}`);
      }

      this.logger.log(`Found report with ID ${reportId}, company ${document.companyId}`);

      // Get identity card for additional company data if needed
      try {
        const identityCard = await this.identityCardService.findById(document.companyId);
        if (identityCard) {
          // Convert MongoDB document to entity using converter service
          return this.converterService.convertDocumentToEntity(document, identityCard);
        }
      } catch (idCardError) {
        this.logger.warn(
          `Could not find identity card for company ${document.companyId}, returning minimal report data`,
        );
      }

      // If identity card is not available, create a minimal entity
      return {
        id: document.id,
        companyId: document.companyId,
        brand: document.brand || document.companyId,
        date: document.date,
        generatedAt: document.generatedAt,
        batchExecutionId: document.batchExecutionId,
        metadata: document.metadata || {
          url: '',
          market: '',
          flag: '',
          competitors: '',
          date: document.date.toISOString().split('T')[0],
          models: '',
        },
        kpi: document.kpi || {
          pulse: { value: '0%', description: 'Global Visibility Score' },
          tone: { value: '0', status: 'yellow', description: 'Overall sentiment' },
          accord: { value: '0/10', status: 'yellow', description: 'Brand compliance' },
          arena: { competitors: [], description: 'Top competitors' },
        },
        pulse: document.pulse || {
          promptsTested: 0,
          modelVisibility: [],
        },
        tone: document.tone || {
          sentiments: [],
          questions: [],
        },
        accord: document.accord || {
          attributes: [],
          score: { value: '0/10', status: 'yellow' },
        },
        arena: document.arena || {
          competitors: [],
        },
        brandBattle: document.brandBattle || {
          competitorAnalyses: [],
          commonStrengths: [],
          commonWeaknesses: [],
        },
        trace: document.trace || {
          consultedWebsites: [],
        },
        llmVersions: document.llmVersions || {},
        rawData: {
          spontaneous: document.spontaneous,
          sentiment: document.sentiment,
          comparison: document.comparison,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get report by ID: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve report: ${error.message}`);
    }
  }

  /**
   * Get the latest report for a company
   * @param companyId The company ID
   * @returns The most recent report in entity format
   */
  async getLatestReport(companyId: string): Promise<WeeklyBrandReportEntity> {
    try {
      const document = await this.weeklyReportRepository.findLatestByCompanyIdLean(companyId);

      if (!document) {
        throw new NotFoundException(`No reports found for company ${companyId}`);
      }

      // Once we have the latest report, use the same logic as getReportById
      return this.getReportById(document.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get latest report: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve report: ${error.message}`);
    }
  }

  /**
   * Get all reports for a company
   * @param companyId The company ID
   * @returns A list of summary data for all reports
   */
  async getAllCompanyReports(companyId: string) {
    try {
      // Get all reports for the company, sorted by week start date (newest first)
      const reports = await this.weeklyReportRepository.findAllByCompanyId(companyId);
      const count = await this.weeklyReportRepository.countByCompanyId(companyId);

      return {
        reports: reports.map((report) => ({
          id: report.id,
          date: report.date,
          generatedAt: report.generatedAt || new Date(),
          brand: report.brand || null, // Include brand if available in new structure
        })),
        total: count,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get reports for company ${companyId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to retrieve reports: ${error.message}`);
    }
  }
}
