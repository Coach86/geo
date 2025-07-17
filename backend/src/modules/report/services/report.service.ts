import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReportQueryService } from './brand-report-query.service';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
    private readonly brandReportQuery: BrandReportQueryService,
  ) {}

  async getLatestReport(projectId: string): Promise<BrandReport | null> {
    const report = await this.brandReportModel
      .findOne({ projectId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    
    return report;
  }

  async findByBatchExecutionId(
    batchExecutionId: string,
  ): Promise<BrandReport[]> {
    const reports = await this.brandReportModel
      .find({ batchExecutionId })
      .lean()
      .exec();
      
    return reports;
  }
}