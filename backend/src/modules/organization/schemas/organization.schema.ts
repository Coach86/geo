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

  @Prop({
    type: {
      maxProjects: { type: Number, default: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_PROJECTS },
      maxAIModels: { type: Number, default: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_AI_MODELS },
      maxSpontaneousPrompts: { type: Number, default: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_SPONTANEOUS_PROMPTS },
      maxUrls: { type: Number, default: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_URLS },
      maxUsers: { type: Number, default: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_USERS }, // -1 for unlimited
    },
    default: {
      maxProjects: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_PROJECTS,
      maxAIModels: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_AI_MODELS,
      maxSpontaneousPrompts: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_SPONTANEOUS_PROMPTS,
      maxUrls: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_URLS,
      maxUsers: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_USERS,
    },
  })
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
    maxSpontaneousPrompts: number;
    maxUrls: number;
    maxUsers: number;
  };

  @Prop({ type: [String], default: [] })
  selectedModels: string[];

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

// Add indexes
OrganizationSchema.index({ id: 1 });
OrganizationSchema.index({ stripeCustomerId: 1 });