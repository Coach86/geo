import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { BrandReportResponseDto } from '../dto/brand-report-response.dto';

@Injectable()
export class BrandReportService {
  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
  ) {}

  async getProjectReports(
    projectId: string, 
    limit: number = 10
  ): Promise<BrandReportResponseDto[]> {
    const reports = await this.brandReportModel
      .find({ projectId })
      .sort({ reportDate: -1 })
      .limit(limit)
      .lean();

    return reports.map(report => this.mapToResponseDto(report));
  }

  async getReport(reportId: string): Promise<BrandReportResponseDto> {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return this.mapToResponseDto(report);
  }

  async getExplorerData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('explorer')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.explorer;
  }

  async getVisibilityData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('visibility')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.visibility;
  }

  async getSentimentData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('sentiment')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.sentiment;
  }

  async getAlignmentData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('alignment')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.alignment;
  }

  async getCompetitionData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('competition')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.competition;
  }

  private mapToResponseDto(report: any): BrandReportResponseDto {
    return {
      id: report.id,
      projectId: report.projectId,
      reportDate: report.reportDate,
      generatedAt: report.generatedAt,
      brandName: report.brandName,
      metadata: report.metadata,
      explorer: report.explorer,
      visibility: report.visibility,
      sentiment: report.sentiment,
      alignment: report.alignment,
      competition: report.competition,
    };
  }
}