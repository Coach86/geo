import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GenerationJob, GenerationJobDocument } from '../entities/generation-job.entity';

@Injectable()
export class GenerationJobRepository {
  private readonly logger = new Logger(GenerationJobRepository.name);

  constructor(
    @InjectModel('GenerationJob')
    private readonly generationJobModel: Model<GenerationJobDocument>,
  ) {}

  async create(job: Omit<GenerationJob, 'id' | 'createdAt'>): Promise<GenerationJob> {
    const created = await this.generationJobModel.create(job);
    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<GenerationJob | null> {
    const document = await this.generationJobModel.findById(id).exec();
    return document ? this.mapToEntity(document) : null;
  }

  async findByProjectId(projectId: string): Promise<GenerationJob[]> {
    const documents = await this.generationJobModel
      .find({ projectId })
      .sort({ createdAt: -1 })
      .exec();
    return documents.map(doc => this.mapToEntity(doc));
  }

  async findPendingJobs(): Promise<GenerationJob[]> {
    const documents = await this.generationJobModel
      .find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .exec();
    return documents.map(doc => this.mapToEntity(doc));
  }

  async findRunningJobs(): Promise<GenerationJob[]> {
    const documents = await this.generationJobModel
      .find({ status: 'running' })
      .exec();
    return documents.map(doc => this.mapToEntity(doc));
  }

  async updateStatus(
    id: string, 
    status: GenerationJob['status'],
    results?: GenerationJob['results']
  ): Promise<GenerationJob | null> {
    const update: any = { status };
    
    if (results) {
      update.results = results;
    }
    
    if (status === 'completed' || status === 'failed') {
      update.completedAt = new Date();
    }
    
    const updated = await this.generationJobModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
    
    return updated ? this.mapToEntity(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.generationJobModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    const result = await this.generationJobModel.deleteMany({ projectId }).exec();
    return result.deletedCount;
  }

  async countByProjectId(projectId: string): Promise<number> {
    return this.generationJobModel.countDocuments({ projectId }).exec();
  }

  async findStalledJobs(stalledSince: Date): Promise<GenerationJob[]> {
    const documents = await this.generationJobModel
      .find({
        status: 'running',
        createdAt: { $lte: stalledSince },
      })
      .exec();
    return documents.map(doc => this.mapToEntity(doc));
  }

  private mapToEntity(document: GenerationJobDocument): GenerationJob {
    return {
      id: document._id.toString(),
      projectId: document.projectId,
      status: document.status,
      config: document.config,
      results: document.results,
      createdAt: document.createdAt,
      completedAt: document.completedAt,
    };
  }
}