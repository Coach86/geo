import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type BatchResultDocument = BatchResult & Document;

@Schema({
  collection: 'batch_results',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, // Explicitly name timestamp fields
})
export class BatchResult {
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
    enum: ['visibility', 'sentiment', 'competition', 'alignment'], 
  })
  resultType: string;

  @Prop({ 
    type: Object, 
    required: true,
    default: {},
  })
  result: any;
  
  @Prop({ type: Date })
  createdAt: Date;
  
  @Prop({ type: Date })
  updatedAt: Date;
}

export const BatchResultSchema = SchemaFactory.createForClass(BatchResult);

// Add index on batchExecutionId for faster lookups
BatchResultSchema.index({ batchExecutionId: 1 });