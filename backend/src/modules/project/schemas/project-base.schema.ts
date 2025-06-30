import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/schemas/user.schema';

export type ProjectDocument = Project & Document;

@Schema({
  collection: 'projects',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, // Explicitly name timestamp fields
})
export class Project {
  @Prop({
    type: String,
    default: () => uuidv4(),
    index: true,
  })
  id: string;

  @Prop({ required: false })
  name: string;

  @Prop({ required: true })
  brandName: string;

  @Prop({ required: true })
  website: string;

  @Prop({ required: false })
  favicon?: string;

  @Prop({ required: true })
  industry: string;

  @Prop({ required: true })
  market: string;

  @Prop({ required: false })
  language: string;

  @Prop({ required: true })
  shortDescription: string;

  @Prop({ required: true })
  fullDescription: string;

  @Prop({ required: false })
  objectives: string;

  @Prop({
    type: [String],
    required: true,
    default: [],
  })
  keyBrandAttributes: string[];

  @Prop({
    type: [String],
    default: [],
  })
  scrapedKeywords: string[];

  @Prop({
    type: [String],
    required: true,
    default: [],
  })
  competitors: string[];

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        website: { type: String, required: false },
      },
    ],
    default: [],
  })
  competitorDetails: Array<{
    name: string;
    website?: string;
  }>;

  @Prop({
    type: Object,
    default: {},
  })
  data: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.String, ref: 'Organization', required: true })
  organizationId: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;

  @Prop({ type: Date, required: false })
  nextManualAnalysisAllowedAt?: Date;

  @Prop({ type: Date, required: false })
  recoveryAttemptedAt?: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
