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
  projectId: string;

  @Prop({ 
    type: [String], 
    required: true, 
    default: [] 
  })
  visibility: string[];

  @Prop({ 
    type: [String], 
    required: true, 
    default: [] 
  })
  sentiment: string[];

  @Prop({ 
    type: [String], 
    required: true, 
    default: [] 
  })
  competition: string[];

  @Prop({ 
    type: [String], 
    required: false, 
    default: [] 
  })
  alignment: string[];
  
  // brandBattle field removed - merged into competition
  
  @Prop({ type: Date })
  createdAt: Date;
  
  @Prop({ type: Date })
  updatedAt: Date;
}

export const PromptSetSchema = SchemaFactory.createForClass(PromptSet);

// Create a unique index for projectId
PromptSetSchema.index({ projectId: 1 }, { unique: true });