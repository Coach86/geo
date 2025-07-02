import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContentScore, ScoreIssue } from '../schemas/content-score.schema';

@Injectable()
export class ContentScoreRepository {
  constructor(
    @InjectModel(ContentScore.name)
    private readonly contentScoreModel: Model<ContentScore>,
  ) {}

  async create(data: Partial<ContentScore>): Promise<ContentScore> {
    const contentScore = new this.contentScoreModel(data);
    return contentScore.save();
  }

  async findById(id: string): Promise<ContentScore | null> {
    return this.contentScoreModel.findById(id).exec();
  }

  async findByProjectIdAndUrl(projectId: string, url: string): Promise<ContentScore | null> {
    return this.contentScoreModel.findOne({ projectId, url }).exec();
  }

  async findByProjectId(projectId: string, limit?: number): Promise<ContentScore[]> {
    const query = this.contentScoreModel.find({ projectId }).sort({ analyzedAt: -1 });
    if (limit) {
      query.limit(limit);
    }
    return query.exec();
  }

  async findTopScoresByProjectId(projectId: string, limit: number = 10): Promise<ContentScore[]> {
    return this.contentScoreModel
      .find({ projectId, skipped: { $ne: true } })
      .sort({ globalScore: -1 })
      .limit(limit)
      .exec();
  }

  async findLowScoresByProjectId(projectId: string, limit: number = 10): Promise<ContentScore[]> {
    return this.contentScoreModel
      .find({ projectId, skipped: { $ne: true } })
      .sort({ globalScore: 1 })
      .limit(limit)
      .exec();
  }

  async findByProjectIdWithIssues(projectId: string, severity?: string): Promise<ContentScore[]> {
    const query: any = { projectId, 'issues.0': { $exists: true } };
    if (severity) {
      query['issues.severity'] = severity;
    }
    return this.contentScoreModel.find(query).sort({ analyzedAt: -1 }).exec();
  }

  async getProjectScoreStats(projectId: string) {
    const stats = await this.contentScoreModel.aggregate([
      { $match: { projectId, skipped: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalPages: { $sum: 1 },
          avgGlobalScore: { $avg: '$globalScore' },
          avgAuthorityScore: { $avg: '$scores.authority' },
          avgFreshnessScore: { $avg: '$scores.freshness' },
          avgStructureScore: { $avg: '$scores.structure' },
          avgBrandScore: { $avg: '$scores.brandAlignment' },
          minGlobalScore: { $min: '$globalScore' },
          maxGlobalScore: { $max: '$globalScore' },
          lastAnalyzedAt: { $max: '$analyzedAt' },
        },
      },
    ]).exec();

    return stats[0] || {
      totalPages: 0,
      avgGlobalScore: 0,
      avgAuthorityScore: 0,
      avgFreshnessScore: 0,
      avgStructureScore: 0,
      avgSnippetScore: 0,
      avgBrandScore: 0,
      minGlobalScore: 0,
      maxGlobalScore: 0,
      lastAnalyzedAt: null,
    };
  }

  async getIssuesSummary(projectId: string) {
    const issues = await this.contentScoreModel.aggregate([
      { $match: { projectId, skipped: { $ne: true } } },
      { $unwind: '$issues' },
      {
        $group: {
          _id: {
            dimension: '$issues.dimension',
            severity: '$issues.severity',
          },
          count: { $sum: 1 },
          descriptions: { $addToSet: '$issues.description' },
        },
      },
      {
        $group: {
          _id: '$_id.dimension',
          severities: {
            $push: {
              severity: '$_id.severity',
              count: '$count',
              descriptions: '$descriptions',
            },
          },
          totalIssues: { $sum: '$count' },
        },
      },
      { $sort: { totalIssues: -1 } },
    ]).exec();

    return issues;
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    const result = await this.contentScoreModel.deleteMany({ projectId }).exec();
    return result.deletedCount || 0;
  }

  async upsert(projectId: string, url: string, data: Partial<ContentScore>): Promise<ContentScore> {
    return this.contentScoreModel.findOneAndUpdate(
      { projectId, url },
      { $set: data },
      { new: true, upsert: true }
    ).exec();
  }

  async getScoreDistribution(projectId: string) {
    const distribution = await this.contentScoreModel.aggregate([
      { $match: { projectId } },
      {
        $bucket: {
          groupBy: '$globalScore',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            urls: { $push: '$url' },
          },
        },
      },
    ]).exec();

    return distribution;
  }
}