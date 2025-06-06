import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CrawledPage, CrawledPageDocument } from '../schemas/crawled-page.schema';

@Injectable()
export class CrawledPageRepository {
  constructor(
    @InjectModel(CrawledPage.name) private crawledPageModel: Model<CrawledPageDocument>,
  ) {}

  async create(data: Partial<CrawledPage>): Promise<CrawledPageDocument> {
    const crawledPage = new this.crawledPageModel(data);
    return crawledPage.save();
  }

  async findByProjectId(projectId: string): Promise<CrawledPageDocument[]> {
    return this.crawledPageModel.find({ projectId }).exec();
  }

  async findByUrl(projectId: string, url: string): Promise<CrawledPageDocument | null> {
    return this.crawledPageModel.findOne({ projectId, url }).exec();
  }

  async updateByUrl(
    projectId: string, 
    url: string, 
    data: Partial<CrawledPage>
  ): Promise<CrawledPageDocument | null> {
    return this.crawledPageModel.findOneAndUpdate(
      { projectId, url },
      data,
      { new: true }
    ).exec();
  }

  async countByProject(projectId: string): Promise<number> {
    return this.crawledPageModel.countDocuments({ projectId }).exec();
  }

  async deleteByProject(projectId: string): Promise<void> {
    await this.crawledPageModel.deleteMany({ projectId }).exec();
  }

  async findByProjectWithStatus(
    projectId: string, 
    status: string
  ): Promise<CrawledPageDocument[]> {
    return this.crawledPageModel.find({ projectId, status }).exec();
  }

  async getUrlsByProject(projectId: string): Promise<string[]> {
    const pages = await this.crawledPageModel
      .find({ projectId, status: 'success' })
      .select('url')
      .exec();
    return pages.map(p => p.url);
  }

  async findByProject(projectId: string): Promise<CrawledPageDocument[]> {
    return this.crawledPageModel
      .find({ projectId, status: 'success' })
      .exec();
  }

  async getLastCrawlDate(projectId: string): Promise<Date | null> {
    const lastPage = await this.crawledPageModel
      .findOne({ projectId })
      .sort({ crawledAt: -1 })
      .select('crawledAt')
      .exec();
    
    return lastPage?.crawledAt || null;
  }

  async deleteOldPages(beforeDate: Date): Promise<number> {
    const result = await this.crawledPageModel.deleteMany({
      crawledAt: { $lt: beforeDate }
    });
    return result.deletedCount || 0;
  }
}