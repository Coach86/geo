import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { ReportStructure } from '../interfaces/report.interfaces';

@Injectable()
export class BrandReportPersistenceService {
  private readonly logger = new Logger(BrandReportPersistenceService.name);

  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
  ) {}

  async saveReport(reportData: ReportStructure): Promise<BrandReportDocument> {
    try {
      // Debug logging for competition data
      if (reportData.competition) {
        this.logger.log(`Saving report with competition data: ${JSON.stringify({
          hasDetailedResults: !!(reportData.competition as any).detailedResults,
          detailedResultsCount: (reportData.competition as any).detailedResults?.length || 0,
          competitorAnalysesCount: reportData.competition.competitorAnalyses?.length || 0
        })}`);
      }
      
      const report = new this.brandReportModel(reportData);
      const saved = await report.save();
      
      // Verify what was actually saved
      const savedCompetition = saved.competition as any;
      this.logger.log(`Saved report competition data: ${JSON.stringify({
        hasDetailedResults: !!savedCompetition?.detailedResults,
        detailedResultsCount: savedCompetition?.detailedResults?.length || 0
      })}`);
      
      return saved;
    } catch (error) {
      this.logger.error(`Failed to save brand report: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateReport(reportId: string, reportData: Partial<ReportStructure>): Promise<BrandReportDocument> {
    try {
      const updated = await this.brandReportModel
        .findOneAndUpdate(
          { id: reportId },
          { $set: reportData },
          { new: true }
        )
        .lean();
      
      if (!updated) {
        throw new Error(`Report with ID ${reportId} not found`);
      }
      
      return updated as BrandReportDocument;
    } catch (error) {
      this.logger.error(`Failed to update brand report: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteReport(reportId: string): Promise<void> {
    try {
      const result = await this.brandReportModel.deleteOne({ id: reportId });
      if (result.deletedCount === 0) {
        throw new Error(`Report with ID ${reportId} not found`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete brand report: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    try {
      const result = await this.brandReportModel.deleteMany({ projectId });
      this.logger.log(`Deleted ${result.deletedCount} brand reports for project ${projectId}`);
      return result.deletedCount;
    } catch (error) {
      this.logger.error(`Failed to delete brand reports for project ${projectId}: ${error.message}`, error.stack);
      throw error;
    }
  }
}