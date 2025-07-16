import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContentItem, ContentItemDocument } from '../entities/content-item.entity';

@Injectable()
export class ContentItemRepository {
  private readonly logger = new Logger(ContentItemRepository.name);

  constructor(
    @InjectModel('ContentItem')
    private readonly contentItemModel: Model<ContentItemDocument>,
  ) {}

  async create(contentItem: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentItem> {
    const created = await this.contentItemModel.create(contentItem);
    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<ContentItem | null> {
    const document = await this.contentItemModel.findById(id).exec();
    return document ? this.mapToEntity(document) : null;
  }

  async findByProjectId(projectId: string): Promise<ContentItem[]> {
    const documents = await this.contentItemModel
      .find({ projectId })
      .sort({ createdAt: -1 })
      .exec();
    return documents.map(doc => this.mapToEntity(doc));
  }

  async findByProjectIdAndStatus(projectId: string, status: ContentItem['status']): Promise<ContentItem[]> {
    const documents = await this.contentItemModel
      .find({ projectId, status })
      .sort({ createdAt: -1 })
      .exec();
    return documents.map(doc => this.mapToEntity(doc));
  }

  async findByUrl(url: string, projectId: string): Promise<ContentItem | null> {
    const document = await this.contentItemModel
      .findOne({ url, projectId })
      .exec();
    return document ? this.mapToEntity(document) : null;
  }

  async update(id: string, update: Partial<ContentItem>): Promise<ContentItem | null> {
    const updated = await this.contentItemModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
    return updated ? this.mapToEntity(updated) : null;
  }

  async updateStatus(id: string, status: ContentItem['status']): Promise<ContentItem | null> {
    return this.update(id, { status });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.contentItemModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    const result = await this.contentItemModel.deleteMany({ projectId }).exec();
    return result.deletedCount;
  }

  async countByProjectId(projectId: string): Promise<number> {
    return this.contentItemModel.countDocuments({ projectId }).exec();
  }

  async countByProjectIdAndStatus(projectId: string, status: ContentItem['status']): Promise<number> {
    return this.contentItemModel.countDocuments({ projectId, status }).exec();
  }

  private mapToEntity(document: ContentItemDocument): ContentItem {
    return {
      id: document._id.toString(),
      projectId: document.projectId,
      url: document.url,
      title: document.title,
      content: document.content,
      metadata: document.metadata,
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}