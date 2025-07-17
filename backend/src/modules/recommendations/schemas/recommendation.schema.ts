import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  RecommendationType,
  RecommendationPriority,
  RecommendationStatus,
  ImplementationDifficulty,
} from '../interfaces/recommendation.interfaces';
import { Evidence } from './evidence.schema';

export type RecommendationDocument = Recommendation & Document;

@Schema({
  collection: 'recommendations',
  timestamps: true,
})
export class Recommendation {
  @Prop({
    type: String,
    default: () => uuidv4(),
    index: true,
  })
  id: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  projectId: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  organizationId: string;

  @Prop({
    type: String,
    enum: Object.values(RecommendationType),
    required: true,
    index: true,
  })
  type: RecommendationType;

  @Prop({
    type: String,
    enum: Object.values(RecommendationPriority),
    required: true,
    index: true,
  })
  priority: RecommendationPriority;

  @Prop({
    type: String,
    required: true,
  })
  title: string;

  @Prop({
    type: String,
    required: true,
  })
  description: string;

  @Prop({
    type: String,
    required: true,
  })
  methodology: string;

  @Prop({
    type: [Evidence],
    required: true,
  })
  evidence: Evidence[];

  @Prop({
    type: [String],
    required: true,
  })
  suggestedActions: string[];

  @Prop({
    type: Number,
    required: true,
    min: 0,
    max: 1,
  })
  confidenceScore: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    max: 1,
  })
  impactScore: number;

  @Prop({
    type: String,
    enum: Object.values(ImplementationDifficulty),
    required: true,
  })
  implementationDifficulty: ImplementationDifficulty;

  @Prop({
    type: String,
    enum: Object.values(RecommendationStatus),
    default: RecommendationStatus.NEW,
  })
  status: RecommendationStatus;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  batchExecutionId: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const RecommendationSchema = SchemaFactory.createForClass(Recommendation);

// Create indexes
RecommendationSchema.index({ projectId: 1, type: 1, priority: 1 });
RecommendationSchema.index({ organizationId: 1, status: 1 });
RecommendationSchema.index({ createdAt: -1 });
RecommendationSchema.index({ batchExecutionId: 1 });