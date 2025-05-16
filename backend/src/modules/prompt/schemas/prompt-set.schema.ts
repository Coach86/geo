import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type PromptSetDocument = PromptSet & Document;

@Schema({
  collection: 'prompt_sets',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, // Explicitly name timestamp fields
})
export class PromptSet {
  @Prop({ 
    type: String, 
    default: () => uuidv4(),
    index: true,
  })
  id: string;

  @Prop({ 
    type: String, 
    required: true, 
    index: true 
  })
  companyId: string;

  @Prop({ 
    type: [String], 
    required: true, 
    default: [] 
  })
  spontaneous: string[];

  @Prop({ 
    type: [String], 
    required: true, 
    default: [] 
  })
  direct: string[];

  @Prop({ 
    type: [String], 
    required: true, 
    default: [] 
  })
  comparison: string[];

  @Prop({ 
    type: [String], 
    required: false, 
    default: [] 
  })
  accuracy: string[];
  
  @Prop({ type: Date })
  createdAt: Date;
  
  @Prop({ type: Date })
  updatedAt: Date;
}

export const PromptSetSchema = SchemaFactory.createForClass(PromptSet);

// Create a unique index for companyId
PromptSetSchema.index({ companyId: 1 }, { unique: true });