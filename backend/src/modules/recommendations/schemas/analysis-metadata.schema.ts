import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type AnalysisMetadataDocument = AnalysisMetadata & Document;

@Schema({
  collection: 'analysis_metadata',
  timestamps: true,
})
export class AnalysisMetadata {
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
  batchExecutionId: string;

  @Prop({
    type: Date,
    required: true,
  })
  analyzedAt: Date;

  @Prop({
    type: [String],
    required: true,
  })
  modelsUsed: string[];

  @Prop({
    type: Number,
    required: true,
  })
  promptsAnalyzed: number;

  @Prop({
    type: Number,
    required: true,
  })
  confidenceThreshold: number;

  @Prop({
    type: Number,
    required: true,
  })
  recommendationsGenerated: number;

  @Prop({
    type: Object,
    default: {},
  })
  analyzerMetrics: {
    entityGap: {
      processed: boolean;
      candidatesFound: number;
      executionTime: number;
    };
    featureGap: {
      processed: boolean;
      candidatesFound: number;
      executionTime: number;
    };
    contentPresence: {
      processed: boolean;
      candidatesFound: number;
      executionTime: number;
    };
    localization: {
      processed: boolean;
      candidatesFound: number;
      executionTime: number;
    };
    sentimentImprovement: {
      processed: boolean;
      candidatesFound: number;
      executionTime: number;
    };
  };

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const AnalysisMetadataSchema = SchemaFactory.createForClass(AnalysisMetadata);

// Create indexes
AnalysisMetadataSchema.index({ projectId: 1, analyzedAt: -1 });
AnalysisMetadataSchema.index({ batchExecutionId: 1 });