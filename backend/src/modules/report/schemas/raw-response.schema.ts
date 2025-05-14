import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

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

  @Prop({ required: true })
  llmProvider: string;

  @Prop({ 
    type: String, 
    required: true,
    enum: ['spontaneous', 'direct', 'comparison'], 
  })
  promptType: string;

  @Prop({ required: true })
  promptIndex: number;

  @Prop({ required: true })
  response: string;

  @Prop({ 
    type: [Object], 
    default: [] 
  })
  citations: any[];

  @Prop({ 
    type: [Object], 
    default: [] 
  })
  toolUsage: any[];

  @Prop({ 
    type: Boolean, 
    default: false 
  })
  usedWebSearch: boolean;

  @Prop({ 
    type: Object, 
    default: null 
  })
  responseMetadata: any;
  
  @Prop({ type: Date })
  createdAt: Date;
  
  @Prop({ type: Date })
  updatedAt: Date;
}

export const RawResponseSchema = SchemaFactory.createForClass(RawResponse);

// Add index on batchExecutionId for faster lookups
RawResponseSchema.index({ batchExecutionId: 1 });