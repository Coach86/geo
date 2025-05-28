import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from '../schemas/plan.schema';

@Injectable()
export class PlanRepository {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
  ) {}

  async create(plan: Partial<Plan>): Promise<PlanDocument> {
    const createdPlan = new this.planModel(plan);
    return createdPlan.save();
  }

  async findAll(): Promise<PlanDocument[]> {
    return this.planModel
      .find({ isActive: true })
      .sort({ order: 1 })
      .exec();
  }

  async findAllIncludingInactive(): Promise<PlanDocument[]> {
    return this.planModel
      .find()
      .sort({ order: 1 })
      .exec();
  }

  async findById(id: string): Promise<PlanDocument | null> {
    return this.planModel.findById(id).exec();
  }

  async findByStripeProductId(stripeProductId: string): Promise<PlanDocument | null> {
    return this.planModel.findOne({ stripeProductId }).exec();
  }

  async update(id: string, plan: Partial<Plan>): Promise<PlanDocument | null> {
    return this.planModel
      .findByIdAndUpdate(id, plan, { new: true })
      .exec();
  }

  async delete(id: string): Promise<PlanDocument | null> {
    return this.planModel.findByIdAndDelete(id).exec();
  }
}