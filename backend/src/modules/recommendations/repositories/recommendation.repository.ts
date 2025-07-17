import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { 
  Recommendation, 
  RecommendationDocument 
} from '../schemas/recommendation.schema';

@Injectable()
export class RecommendationRepository {
  constructor(
    @InjectModel(Recommendation.name)
    private recommendationModel: Model<RecommendationDocument>,
  ) {}

  async create(data: Partial<Recommendation>): Promise<Recommendation> {
    const recommendation = new this.recommendationModel(data);
    const saved = await recommendation.save();
    return saved.toObject() as Recommendation;
  }

  async createMany(data: Partial<Recommendation>[]): Promise<Recommendation[]> {
    const docs = await this.recommendationModel.insertMany(data);
    return docs.map(doc => doc.toObject() as Recommendation);
  }

  async find(
    filter: any,
    pagination: { limit: number; offset: number },
  ): Promise<Recommendation[]> {
    const docs = await this.recommendationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(pagination.limit)
      .skip(pagination.offset)
      .lean()
      .exec();
    return docs as Recommendation[];
  }

  async findOne(filter: any): Promise<Recommendation | null> {
    const doc = await this.recommendationModel.findOne(filter).lean().exec();
    return doc as Recommendation | null;
  }

  async findById(id: string): Promise<Recommendation | null> {
    const doc = await this.recommendationModel.findOne({ id }).lean().exec();
    return doc as Recommendation | null;
  }

  async update(
    filter: any,
    update: Partial<Recommendation>,
  ): Promise<Recommendation | null> {
    const doc = await this.recommendationModel
      .findOneAndUpdate(filter, update, { new: true })
      .lean()
      .exec();
    return doc as Recommendation | null;
  }

  async delete(filter: any): Promise<void> {
    await this.recommendationModel.deleteOne(filter).exec();
  }

  async deleteMany(filter: any): Promise<void> {
    await this.recommendationModel.deleteMany(filter).exec();
  }

  async count(filter: any): Promise<number> {
    return this.recommendationModel.countDocuments(filter).exec();
  }

  async findByProjectId(
    projectId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
      type?: string;
    },
  ): Promise<Recommendation[]> {
    const filter: any = { projectId };
    
    if (options?.status) {
      filter.status = options.status;
    }
    
    if (options?.type) {
      filter.type = options.type;
    }

    const query = this.recommendationModel
      .find(filter)
      .sort({ priority: -1, createdAt: -1 });

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.skip(options.offset);
    }

    const docs = await query.lean().exec();
    return docs as Recommendation[];
  }

  async findByOrganizationId(
    organizationId: string,
    options?: {
      limit?: number;
      offset?: number;
      projectIds?: string[];
    },
  ): Promise<Recommendation[]> {
    const filter: any = { organizationId };
    
    if (options?.projectIds?.length) {
      filter.projectId = { $in: options.projectIds };
    }

    const query = this.recommendationModel
      .find(filter)
      .sort({ createdAt: -1 });

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.skip(options.offset);
    }

    const docs = await query.lean().exec();
    return docs as Recommendation[];
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.recommendationModel.aggregate(pipeline).exec();
  }

  async getTypeDistribution(
    projectId: string,
  ): Promise<{ _id: string; count: number }[]> {
    return this.recommendationModel.aggregate([
      { $match: { projectId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec();
  }

  async getPriorityDistribution(
    projectId: string,
  ): Promise<{ _id: string; count: number }[]> {
    return this.recommendationModel.aggregate([
      { $match: { projectId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec();
  }

  async getStatusDistribution(
    projectId: string,
  ): Promise<{ _id: string; count: number }[]> {
    return this.recommendationModel.aggregate([
      { $match: { projectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec();
  }
}