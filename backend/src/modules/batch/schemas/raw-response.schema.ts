import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PromptType } from '../interfaces/llm.interfaces';
export type RawResponseDocument = RawResponse & Document;

@Schema({
  collection: 'raw_responses',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, // Explicitly name timestamp fields
})
export class RawResponse {
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
  batchExecutionId: string;

  @Prop({
    type: String,
    required: true,
    enum: PromptType,
  })
  promptType: string;

  @Prop({ required: true })
  promptIndex: number;

  @Prop({ required: true })
  originalPrompt: string;

  @Prop({ required: true })
  llmResponse: string;

  @Prop({ required: true })
  llmResponseModel: string;

  @Prop({ required: false })
  analyzerPrompt: string;

  @Prop({
    type: Object,
    required: false,
  })
  analyzerResponse: any;

  @Prop({ required: false })
  analyzerResponseModel: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const RawResponseSchema = SchemaFactory.createForClass(RawResponse);

// Add index on batchExecutionId for faster lookups
RawResponseSchema.index({ batchExecutionId: 1 });
