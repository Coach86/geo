import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { BrandReportResponseDto } from '../dto/brand-report-response.dto';
import { ExplorerData } from '../interfaces/report.interfaces';
import { 
  VisibilityData, 
  SentimentData, 
  AlignmentData 
} from '../types/brand-report.types';
import { CompetitionData } from '../interfaces/report.interfaces';
import { BrandReportMapperService } from './brand-report-mapper.service';

/**
 * Service for querying brand report data
 * Handles basic CRUD operations for brand reports
 */
@Injectable()
export class BrandReportQueryService {
  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
    private mapperService: BrandReportMapperService,
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

    return reports.map(report => this.mapperService.mapToResponseDto(report));
  }

  async getReport(reportId: string): Promise<BrandReportResponseDto> {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return this.mapperService.mapToResponseDto(report);
  }

  async getExplorerData(reportId: string): Promise<ExplorerData> {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('explorer')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.explorer;
  }

  async getVisibilityData(reportId: string): Promise<VisibilityData> {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('visibility')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.visibility;
  }

  async getSentimentData(reportId: string): Promise<SentimentData> {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('sentiment')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.sentiment;
  }

  async getAlignmentData(reportId: string): Promise<AlignmentData> {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('alignment')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    // Ensure alignment data has required structure
    if (!report.alignment) {
      throw new NotFoundException(`Alignment data not found for report ${reportId}`);
    }

    // Handle both new and legacy formats
    const alignmentData: AlignmentData = {
      summary: report.alignment.summary || {
        overallAlignmentScore: 0,
        averageAttributeScores: {},
        attributeAlignmentSummary: []
      },
      detailedResults: report.alignment.detailedResults || []
    };

    return alignmentData;
  }

  async getCompetitionData(reportId: string): Promise<CompetitionData> {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('competition')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.competition;
  }
}