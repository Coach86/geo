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
          // Updated to use new field names (scores instead of aeoScores)
          avgTechnicalScore: { $avg: '$scores.technical' },
          avgStructureScore: { $avg: '$scores.structure' },
          avgAuthorityScore: { $avg: '$scores.authority' },
          avgMonitoringKpiScore: { $avg: '$scores.quality' },
          minGlobalScore: { $min: '$globalScore' },
          maxGlobalScore: { $max: '$globalScore' },
          lastAnalyzedAt: { $max: '$analyzedAt' },
        },
      },
    ]).exec();

    return stats[0] || {
      totalPages: 0,
      avgGlobalScore: 0,
      avgTechnicalScore: 0,
      avgStructureScore: 0,
      avgAuthorityScore: 0,
      avgMonitoringKpiScore: 0,
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
    // DocumentDB doesn't support $bucket, so we'll use a manual approach
    const allScores = await this.contentScoreModel
      .find({ projectId })
      .select('globalScore url')
      .exec();

    // Define the buckets
    interface Bucket {
      _id: number;
      min: number;
      max: number;
      count: number;
      urls: string[];
    }

    const buckets: Bucket[] = [
      { _id: 0, min: 0, max: 20, count: 0, urls: [] },
      { _id: 20, min: 20, max: 40, count: 0, urls: [] },
      { _id: 40, min: 40, max: 60, count: 0, urls: [] },
      { _id: 60, min: 60, max: 80, count: 0, urls: [] },
      { _id: 80, min: 80, max: 100, count: 0, urls: [] },
    ];

    // Manually bucket the scores
    allScores.forEach((score) => {
      const globalScore = score.globalScore || 0;
      const url = score.url;

      // Find the appropriate bucket
      for (const bucket of buckets) {
        if (globalScore >= bucket.min && globalScore < bucket.max) {
          bucket.count++;
          bucket.urls.push(url);
          break;
        }
      }
    });

    // Format the response to match the expected $bucket output
    return buckets.map(bucket => ({
      _id: bucket._id,
      count: bucket.count,
      urls: bucket.urls,
    }));
  }
}