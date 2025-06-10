import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ActionPlanDocument = ActionPlan & Document;

@Schema({ 
  collection: 'action_plans',
  timestamps: true 
})
export class ActionPlan {
  @Prop({ type: String, required: true, index: true })
  projectId: string;

  @Prop({ required: true, index: true })
  scanId: string;

  @Prop({ type: Object, required: true })
  overallScore: {
    current: number;
    projected: number;
  };

  @Prop({ type: [Object], required: true })
  phases: Array<{
    name: string;
    duration: string;
    items: Array<{
      id: string;
      priority: 'high' | 'medium' | 'low';
      category: string;
      title: string;
      problem: string;
      solution: string;
      specificContent: string;
      targetPage: string;
      timeline: string;
      completed: boolean;
      estimatedImpact: 'high' | 'medium' | 'low';
      validation?: {
        tested: boolean;
        beforeScore: { bm25: number; vector: number; };
        afterScore: { bm25: number; vector: number; };
        improvement: number;
        affectedQueries: string[];
      };
    }>;
  }>;

  @Prop({ required: true })
  totalItems: number;

  @Prop({ required: true })
  estimatedTimeToComplete: string;

  @Prop({ type: Date, default: Date.now })
  generatedAt: Date;

  @Prop({ type: Map, of: Boolean, default: {} })
  completedItems: Map<string, boolean>;

  @Prop({ type: Number, default: 0 })
  completedCount: number;

  @Prop({ type: Date })
  lastModifiedAt: Date;
}

export const ActionPlanSchema = SchemaFactory.createForClass(ActionPlan);

// Index for efficient queries
ActionPlanSchema.index({ projectId: 1, scanId: 1 }, { unique: true });
ActionPlanSchema.index({ projectId: 1, generatedAt: -1 });