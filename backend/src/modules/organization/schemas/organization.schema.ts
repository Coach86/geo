import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ORGANIZATION_DEFAULTS } from '../constants/defaults';

export type OrganizationDocument = HydratedDocument<Organization>;

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ type: String })
  stripeCustomerId?: string;

  @Prop({ type: String })
  stripePlanId?: string;

  @Prop({ type: String })
  stripeSubscriptionId?: string;

  @Prop({ type: String })
  subscriptionStatus?: string;

  @Prop({ type: Date })
  subscriptionCurrentPeriodEnd?: Date;

  @Prop({
    type: {
      maxProjects: { type: Number, default: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_PROJECTS },
      maxAIModels: { type: Number, default: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_AI_MODELS },
      maxSpontaneousPrompts: { type: Number, default: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_SPONTANEOUS_PROMPTS },
      maxUrls: { type: Number, default: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_URLS },
      maxUsers: { type: Number, default: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_USERS }, // -1 for unlimited
      maxCompetitors: { type: Number, default: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_COMPETITORS || 5 },
    },
    default: {
      maxProjects: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_PROJECTS,
      maxAIModels: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_AI_MODELS,
      maxSpontaneousPrompts: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_SPONTANEOUS_PROMPTS,
      maxUrls: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_URLS,
      maxUsers: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_USERS,
      maxCompetitors: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_COMPETITORS || 5,
    },
  })
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
    maxSpontaneousPrompts: number;
    maxUrls: number;
    maxUsers: number;
    maxCompetitors: number;
  };

  @Prop({ type: [String], default: [] })
  selectedModels: string[];

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;

  // Trial-related fields
  @Prop({ type: Date })
  trialStartDate?: Date;

  @Prop({ type: Date })
  trialEndDate?: Date;

  @Prop({ type: Boolean, default: false })
  isOnTrial?: boolean;

  @Prop({ type: String })
  trialPlanId?: string;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

// Add indexes
OrganizationSchema.index({ id: 1 });
OrganizationSchema.index({ stripeCustomerId: 1 });