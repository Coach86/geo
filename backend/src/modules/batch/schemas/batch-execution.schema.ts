import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type BatchExecutionDocument = BatchExecution & Document;

@Schema({
  collection: 'batch_executions',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, // Explicitly name timestamp fields
})
export class BatchExecution {
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
  companyId: string;

  @Prop({ 
    type: Date, 
    default: Date.now,
    index: true,
  })
  executedAt: Date;

  @Prop({ 
    type: String, 
    default: 'running',
    enum: ['running', 'completed', 'failed'], 
  })
  status: string;
  
  @Prop({ type: Date })
  createdAt: Date;
  
  @Prop({ type: Date })
  updatedAt: Date;
}

export const BatchExecutionSchema = SchemaFactory.createForClass(BatchExecution);