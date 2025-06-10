import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActionPlan, ActionPlanDocument } from '../schemas/action-plan.schema';

@Injectable()
export class ActionPlanRepository {
  constructor(
    @InjectModel(ActionPlan.name) private actionPlanModel: Model<ActionPlanDocument>,
  ) {}

  async create(actionPlan: Partial<ActionPlan>): Promise<ActionPlanDocument> {
    try {
      const created = new this.actionPlanModel(actionPlan);
      const saved = await created.save();
      console.log('Action plan saved to DB:', saved._id);
      return saved;
    } catch (error) {
      console.error('Error saving action plan to DB:', error);
      throw error;
    }
  }

  async findByProjectAndScan(
    projectId: string,
    scanId: string
  ): Promise<ActionPlanDocument | null> {
    console.log('findByProjectAndScan called with:', { projectId, scanId, projectIdType: typeof projectId });
    return this.actionPlanModel.findOne({ projectId, scanId }).exec();
  }

  async findLatestByProject(projectId: string): Promise<ActionPlanDocument | null> {
    return this.actionPlanModel
      .findOne({ projectId })
      .sort({ generatedAt: -1 })
      .exec();
  }

  async findAllByProject(projectId: string): Promise<ActionPlanDocument[]> {
    return this.actionPlanModel
      .find({ projectId })
      .sort({ generatedAt: -1 })
      .exec();
  }

  async updateCompletedItems(
    projectId: string,
    scanId: string,
    itemId: string,
    completed: boolean
  ): Promise<ActionPlanDocument | null> {
    const actionPlan = await this.actionPlanModel.findOne({ projectId, scanId }).exec();
    if (!actionPlan) return null;

    // Update the specific item's completed status
    let found = false;
    actionPlan.phases.forEach(phase => {
      phase.items.forEach(item => {
        if (item.id === itemId) {
          item.completed = completed;
          found = true;
        }
      });
    });

    if (!found) return null;

    // Update completed items map
    if (!actionPlan.completedItems) {
      actionPlan.completedItems = new Map();
    }
    actionPlan.completedItems.set(itemId, completed);

    // Recalculate completed count
    actionPlan.completedCount = Array.from(actionPlan.completedItems.values())
      .filter(Boolean).length;

    actionPlan.lastModifiedAt = new Date();

    return actionPlan.save();
  }

  async deleteByProjectAndScan(
    projectId: string,
    scanId: string
  ): Promise<boolean> {
    const result = await this.actionPlanModel.deleteOne({ projectId, scanId }).exec();
    return result.deletedCount > 0;
  }
}