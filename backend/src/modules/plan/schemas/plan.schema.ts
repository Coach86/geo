import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlanDocument = Plan & Document;

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  tag: string;

  @Prop({ required: true })
  subtitle: string;

  @Prop({ type: [String], default: [] })
  included: string[];

  @Prop({ required: true })
  stripeProductId: string;

  @Prop({ required: true, default: 5 })
  maxModels: number;

  @Prop({ required: true, default: 1 })
  maxProjects: number;

  @Prop({ required: true, default: 1 })
  maxUsers: number;

  @Prop({ default: 1 })
  maxUrls: number;

  @Prop({ default: 12 })
  maxSpontaneousPrompts: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isRecommended: boolean;

  @Prop({ default: false })
  isMostPopular: boolean;

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ required: true, default: 5 })
  maxCompetitors: number;

  @Prop({ required: true, default: 'weekly', enum: ['daily', 'weekly', 'unlimited'] })
  refreshFrequency: string;

  @Prop({ required: false })
  shopifyMonthlyPrice?: number;

  @Prop({ required: false })
  shopifyAnnualPrice?: number;

  @Prop({ required: false, default: 7 })
  shopifyTrialDays?: number;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
