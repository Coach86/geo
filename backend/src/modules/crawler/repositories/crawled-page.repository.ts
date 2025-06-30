import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrawledPage } from '../schemas/crawled-page.schema';

@Injectable()
export class CrawledPageRepository {
  constructor(
    @InjectModel(CrawledPage.name)
    private readonly crawledPageModel: Model<CrawledPage>,
  ) {}

  async create(data: Partial<CrawledPage>): Promise<CrawledPage> {
    const crawledPage = new this.crawledPageModel(data);
    return crawledPage.save();
  }

  async upsert(projectId: string, url: string, data: Partial<CrawledPage>): Promise<CrawledPage> {
    return this.crawledPageModel.findOneAndUpdate(
      { projectId, url },
      { ...data, projectId, url },
      { upsert: true, new: true }
    ).exec();
  }

  async findById(id: string): Promise<CrawledPage | null> {
    return this.crawledPageModel.findById(id).exec();
  }

  async findByProjectIdAndUrl(projectId: string, url: string): Promise<CrawledPage | null> {
    return this.crawledPageModel.findOne({ projectId, url }).exec();
  }

  async findByProjectId(projectId: string, limit?: number): Promise<CrawledPage[]> {
    const query = this.crawledPageModel.find({ projectId }).sort({ crawledAt: -1 });
    if (limit) {
      query.limit(limit);
    }
    return query.exec();
  }

  async findUnprocessedByProjectId(projectId: string, limit: number = 100): Promise<CrawledPage[]> {
    return this.crawledPageModel
      .find({ projectId, isProcessed: false, statusCode: 200 })
      .sort({ crawledAt: 1 })
      .limit(limit)
      .exec();
  }

  async updateProcessedStatus(id: string, isProcessed: boolean): Promise<CrawledPage | null> {
    return this.crawledPageModel
      .findByIdAndUpdate(id, { isProcessed }, { new: true })
      .exec();
  }

  async countByProjectId(projectId: string): Promise<number> {
    return this.crawledPageModel.countDocuments({ projectId }).exec();
  }

  async countByProjectIdAndStatus(projectId: string, statusCode: number): Promise<number> {
    return this.crawledPageModel.countDocuments({ projectId, statusCode }).exec();
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    const result = await this.crawledPageModel.deleteMany({ projectId }).exec();
    return result.deletedCount || 0;
  }

  async getProjectCrawlStats(projectId: string) {
    const stats = await this.crawledPageModel.aggregate([
      { $match: { projectId } },
      {
        $group: {
          _id: null,
          totalPages: { $sum: 1 },
          successfulPages: {
            $sum: { $cond: [{ $eq: ['$statusCode', 200] }, 1, 0] },
          },
          failedPages: {
            $sum: { $cond: [{ $ne: ['$statusCode', 200] }, 1, 0] },
          },
          processedPages: {
            $sum: { $cond: ['$isProcessed', 1, 0] },
          },
          avgResponseTime: { $avg: '$responseTimeMs' },
          lastCrawledAt: { $max: '$crawledAt' },
        },
      },
    ]).exec();

    return stats[0] || {
      totalPages: 0,
      successfulPages: 0,
      failedPages: 0,
      processedPages: 0,
      avgResponseTime: 0,
      lastCrawledAt: null,
    };
  }

  async updateMany(filter: any, update: any): Promise<any> {
    return this.crawledPageModel.updateMany(filter, update).exec();
  }
}