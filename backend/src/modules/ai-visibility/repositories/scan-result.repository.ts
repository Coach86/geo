import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScanResult, ScanResultDocument } from '../schemas/scan-result.schema';

@Injectable()
export class ScanResultRepository {
  constructor(
    @InjectModel(ScanResult.name) private scanResultModel: Model<ScanResultDocument>,
  ) {}

  async create(data: Partial<ScanResult>): Promise<ScanResultDocument> {
    const scanResult = new this.scanResultModel(data);
    return scanResult.save();
  }

  async findById(id: string): Promise<ScanResultDocument | null> {
    return this.scanResultModel.findOne({ scanId: id }).exec();
  }

  async findByProject(
    projectId: string,
    limit: number = 10
  ): Promise<ScanResultDocument[]> {
    return this.scanResultModel
      .find({ projectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findLatestByProject(projectId: string): Promise<ScanResultDocument | null> {
    return this.scanResultModel
      .findOne({ projectId, status: 'completed' })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateResults(
    scanId: string,
    results: any,
    metrics: any,
    patterns: any[]
  ): Promise<ScanResultDocument | null> {
    return this.scanResultModel.findOneAndUpdate(
      { scanId },
      {
        queryResults: results,
        coverageMetrics: metrics,
        visibilityPatterns: patterns,
      },
      { new: true }
    ).exec();
  }

  async updateStatus(
    scanId: string,
    status: string,
    errorMessage?: string
  ): Promise<ScanResultDocument | null> {
    const update: any = { status };
    if (errorMessage) {
      update.errorMessage = errorMessage;
    }
    if (status === 'completed') {
      update.completedAt = new Date();
    }
    
    return this.scanResultModel.findOneAndUpdate(
      { scanId },
      update,
      { new: true }
    ).exec();
  }

  async updateRecommendations(
    scanId: string,
    recommendations: any[]
  ): Promise<void> {
    await this.scanResultModel.findOneAndUpdate(
      { scanId },
      { recommendations }
    ).exec();
  }
  
  async updateQueries(
    scanId: string,
    queries: string[]
  ): Promise<void> {
    await this.scanResultModel.findOneAndUpdate(
      { scanId },
      { queries }
    ).exec();
  }

  async deleteByProject(projectId: string): Promise<void> {
    await this.scanResultModel.deleteMany({ projectId }).exec();
  }

  async deleteOldScans(beforeDate: Date): Promise<number> {
    const result = await this.scanResultModel.deleteMany({
      createdAt: { $lt: beforeDate }
    });
    return result.deletedCount || 0;
  }
}