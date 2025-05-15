import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WeeklyBrandReport as WeeklyBrandReportEntity } from '../entities/weekly-brand-report.entity';
import {
  WeeklyBrandReport,
  WeeklyBrandReportDocument,
} from '../schemas/weekly-brand-report.schema';

/**
 * Service responsible for retrieving reports from the database
 */
@Injectable()
export class ReportRetrievalService {
  private readonly logger = new Logger(ReportRetrievalService.name);

  constructor(
    @InjectModel(WeeklyBrandReport.name)
    private weeklyReportModel: Model<WeeklyBrandReportDocument>,
  ) {}

  /**
   * Get a report by ID, transforming it to the entity format
   */
  async getReportById(
    reportId: string, 
    transformToEntityFormat: (report: WeeklyBrandReportDocument, identityCard?: any) => Promise<WeeklyBrandReportEntity>,
    getCompanyIdentityCard: (companyId: string) => Promise<any>
  ): Promise<WeeklyBrandReportEntity> {
    try {
      this.logger.log(`Looking up report with ID ${reportId} using 'id' field query`);

      // Use findOne with the 'id' field instead of findById which uses MongoDB's _id
      const report = await this.weeklyReportModel.findOne({ id: reportId }).exec();

      if (!report) {
        this.logger.warn(`Report not found with ID ${reportId}`);
        throw new NotFoundException(`Report not found with ID ${reportId}`);
      }

      this.logger.log(`Found report with ID ${reportId}, company ${report.companyId}`);

      // Get identity card for additional data
      const identityCard = await getCompanyIdentityCard(report.companyId);
      
      // Transform to entity with new structure
      const reportEntity = await transformToEntityFormat(report, identityCard);
      
      return reportEntity;
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
   */
  async getLatestReport(
    companyId: string,
    transformToEntityFormat: (report: WeeklyBrandReportDocument, identityCard?: any) => Promise<WeeklyBrandReportEntity>,
    getCompanyIdentityCard: (companyId: string) => Promise<any>
  ): Promise<WeeklyBrandReportEntity> {
    try {
      // Get the latest report for the company
      const report = await this.weeklyReportModel
        .findOne({ companyId })
        .sort({ weekStart: -1 })
        .exec();

      if (!report) {
        throw new NotFoundException(`No reports found for company ${companyId}`);
      }

      // Get identity card for additional data
      const identityCard = await getCompanyIdentityCard(report.companyId);
      
      // Transform to entity with new structure
      const reportEntity = await transformToEntityFormat(report, identityCard);
      
      return reportEntity;
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
   */
  async getAllCompanyReports(companyId: string) {
    try {
      // Get all reports for the company, sorted by week start date (newest first)
      const reports = await this.weeklyReportModel
        .find({ companyId })
        .sort({ weekStart: -1 })
        .exec();

      return {
        reports: reports.map((report) => ({
          id: report.id,
          weekStart: report.weekStart,
          generatedAt: report.generatedAt || new Date(),
          brand: report.brand || null, // Include brand if available in new structure
        })),
        total: reports.length,
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