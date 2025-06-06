import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SearchIndex, SearchIndexDocument } from '../schemas/search-index.schema';

@Injectable()
export class SearchIndexRepository {
  constructor(
    @InjectModel(SearchIndex.name) private searchIndexModel: Model<SearchIndexDocument>,
  ) {}

  async create(data: Partial<SearchIndex>): Promise<SearchIndexDocument> {
    const searchIndex = new this.searchIndexModel(data);
    return searchIndex.save();
  }

  async findByProjectAndType(
    projectId: string, 
    indexType: string
  ): Promise<SearchIndexDocument | null> {
    return this.searchIndexModel
      .findOne({ projectId, indexType, status: 'ready' })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: Types.ObjectId): Promise<SearchIndexDocument | null> {
    return this.searchIndexModel.findById(id).exec();
  }

  async updateStatus(
    id: Types.ObjectId,
    status: string,
    errorMessage?: string
  ): Promise<SearchIndexDocument | null> {
    const update: any = { status };
    if (errorMessage) {
      update.errorMessage = errorMessage;
    }
    if (status === 'ready') {
      update.buildCompletedAt = new Date();
    }
    
    return this.searchIndexModel.findByIdAndUpdate(
      id,
      update,
      { new: true }
    ).exec();
  }

  async updateChunks(
    id: Types.ObjectId,
    chunks: any[],
    chunkCount: number
  ): Promise<void> {
    await this.searchIndexModel.findByIdAndUpdate(id, {
      chunks,
      chunkCount,
      status: 'ready',
      buildCompletedAt: new Date(),
    }).exec();
  }

  async markOutdated(projectId: string): Promise<void> {
    await this.searchIndexModel.updateMany(
      { projectId, status: 'ready' },
      { status: 'outdated' }
    ).exec();
  }

  async deleteByProject(projectId: string): Promise<void> {
    await this.searchIndexModel.deleteMany({ projectId }).exec();
  }

  async getLatestIndexes(projectId: string): Promise<{
    bm25: SearchIndexDocument | null;
    vector: SearchIndexDocument | null;
  }> {
    const [bm25, vector] = await Promise.all([
      this.findByProjectAndType(projectId, 'bm25'),
      this.findByProjectAndType(projectId, 'vector'),
    ]);
    
    return { bm25, vector };
  }
  
  async findByIdAndUpdate(
    id: Types.ObjectId,
    update: any
  ): Promise<SearchIndexDocument | null> {
    return this.searchIndexModel.findByIdAndUpdate(
      id,
      update,
      { new: true }
    ).exec();
  }

  async deleteOldIndexes(beforeDate: Date): Promise<number> {
    const result = await this.searchIndexModel.deleteMany({
      createdAt: { $lt: beforeDate }
    });
    return result.deletedCount || 0;
  }
}