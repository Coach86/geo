import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GeneratedArticle, GeneratedArticleDocument } from '../entities/generated-article.entity';

@Injectable()
export class GeneratedArticleRepository {
  private readonly logger = new Logger(GeneratedArticleRepository.name);

  constructor(
    @InjectModel('GeneratedArticle')
    private readonly generatedArticleModel: Model<GeneratedArticleDocument>,
  ) {}

  async create(article: Omit<GeneratedArticle, 'id' | 'createdAt' | 'updatedAt'>): Promise<GeneratedArticle> {
    const created = await this.generatedArticleModel.create(article);
    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<GeneratedArticle | null> {
    const document = await this.generatedArticleModel.findById(id).exec();
    return document ? this.mapToEntity(document) : null;
  }

  async findByProjectId(projectId: string): Promise<GeneratedArticle[]> {
    const documents = await this.generatedArticleModel
      .find({ projectId })
      .sort({ createdAt: -1 })
      .exec();
    return documents.map(doc => this.mapToEntity(doc));
  }

  async findByProjectIdAndStatus(projectId: string, status: GeneratedArticle['status']): Promise<GeneratedArticle[]> {
    const documents = await this.generatedArticleModel
      .find({ projectId, status })
      .sort({ createdAt: -1 })
      .exec();
    return documents.map(doc => this.mapToEntity(doc));
  }

  async findByGenerationJobId(generationJobId: string): Promise<GeneratedArticle[]> {
    const documents = await this.generatedArticleModel
      .find({ generationJobId })
      .sort({ createdAt: -1 })
      .exec();
    return documents.map(doc => this.mapToEntity(doc));
  }

  async update(id: string, update: Partial<GeneratedArticle>): Promise<GeneratedArticle | null> {
    const updated = await this.generatedArticleModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
    return updated ? this.mapToEntity(updated) : null;
  }

  async updateStatus(id: string, status: GeneratedArticle['status']): Promise<GeneratedArticle | null> {
    const update: any = { status };
    if (status === 'published') {
      update.publishedAt = new Date();
    }
    return this.update(id, update);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.generatedArticleModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    const result = await this.generatedArticleModel.deleteMany({ projectId }).exec();
    return result.deletedCount;
  }

  async countByProjectId(projectId: string): Promise<number> {
    return this.generatedArticleModel.countDocuments({ projectId }).exec();
  }

  async countByProjectIdAndStatus(projectId: string, status: GeneratedArticle['status']): Promise<number> {
    return this.generatedArticleModel.countDocuments({ projectId, status }).exec();
  }

  private mapToEntity(document: GeneratedArticleDocument): GeneratedArticle {
    return {
      id: document._id.toString(),
      projectId: document.projectId,
      title: document.title,
      content: document.content,
      summary: document.summary,
      sourceContentIds: document.sourceContentIds,
      generationJobId: document.generationJobId,
      metadata: document.metadata,
      status: document.status,
      publishedAt: document.publishedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}