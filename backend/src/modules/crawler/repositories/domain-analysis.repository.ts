import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DomainAnalysis, DomainAnalysisDocument } from '../schemas/domain-analysis.schema';
import { Recommendation } from '../interfaces/rule.interface';

export interface CreateDomainAnalysisDto {
  domain: string;
  projectId: string;
  analysisResults: any;
  ruleResults: any[];
  overallScore: number;
  calculationDetails: any;
  issues: string[];
  recommendations: Recommendation[];
  metadata: {
    totalPages: number;
    pagesAnalyzed: string[];
    analysisStartedAt: Date;
    analysisCompletedAt: Date;
    llmCallsMade: number;
  };
}

@Injectable()
export class DomainAnalysisRepository {
  constructor(
    @InjectModel(DomainAnalysis.name) 
    private domainAnalysisModel: Model<DomainAnalysisDocument>
  ) {}

  /**
   * Create or update domain analysis results
   */
  async upsert(data: CreateDomainAnalysisDto): Promise<DomainAnalysisDocument> {
    const filter = { domain: data.domain, projectId: data.projectId };
    const update = {
      ...data,
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };

    return this.domainAnalysisModel.findOneAndUpdate(
      filter,
      update,
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    ).exec();
  }

  /**
   * Find domain analysis by domain and project
   */
  async findByDomainAndProject(domain: string, projectId: string): Promise<DomainAnalysisDocument | null> {
    return this.domainAnalysisModel.findOne({
      domain,
      projectId
    }).exec();
  }

  /**
   * Find all domain analyses for a project
   */
  async findByProject(projectId: string): Promise<DomainAnalysisDocument[]> {
    return this.domainAnalysisModel.find({
      projectId
    }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Check if domain analysis exists and is not expired
   */
  async isValidAndNotExpired(domain: string, projectId: string): Promise<boolean> {
    const analysis = await this.domainAnalysisModel.findOne({
      domain,
      projectId,
      expiresAt: { $gt: new Date() }
    }).exec();

    return !!analysis;
  }

  /**
   * Get domain analysis or return null if expired
   */
  async getValidAnalysis(domain: string, projectId: string): Promise<DomainAnalysisDocument | null> {
    return this.domainAnalysisModel.findOne({
      domain,
      projectId,
      expiresAt: { $gt: new Date() }
    }).exec();
  }

  /**
   * Delete domain analysis
   */
  async delete(domain: string, projectId: string): Promise<void> {
    await this.domainAnalysisModel.deleteOne({
      domain,
      projectId
    }).exec();
  }

  /**
   * Delete all domain analyses for a project
   */
  async deleteByProject(projectId: string): Promise<void> {
    await this.domainAnalysisModel.deleteMany({
      projectId
    }).exec();
  }

  /**
   * Get domain analysis statistics for a project
   */
  async getProjectStats(projectId: string): Promise<{
    totalDomains: number;
    averageScore: number;
    lastAnalyzed: Date | null;
  }> {
    const pipeline = [
      { $match: { projectId } },
      {
        $group: {
          _id: null,
          totalDomains: { $sum: 1 },
          averageScore: { $avg: '$overallScore' },
          lastAnalyzed: { $max: '$createdAt' }
        }
      }
    ];

    const result = await this.domainAnalysisModel.aggregate(pipeline).exec();
    
    if (result.length === 0) {
      return {
        totalDomains: 0,
        averageScore: 0,
        lastAnalyzed: null
      };
    }

    return {
      totalDomains: result[0].totalDomains,
      averageScore: Math.round(result[0].averageScore || 0),
      lastAnalyzed: result[0].lastAnalyzed
    };
  }

  /**
   * Get domains that need re-analysis (expired)
   */
  async getExpiredDomains(projectId: string): Promise<string[]> {
    const expired = await this.domainAnalysisModel.find({
      projectId,
      expiresAt: { $lte: new Date() }
    }).select('domain').exec();

    return expired.map(doc => doc.domain);
  }

  /**
   * Update TTL for domain analysis
   */
  async refreshTTL(domain: string, projectId: string, days: number = 30): Promise<void> {
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    
    await this.domainAnalysisModel.updateOne(
      { domain, projectId },
      { expiresAt, updatedAt: new Date() }
    ).exec();
  }
}