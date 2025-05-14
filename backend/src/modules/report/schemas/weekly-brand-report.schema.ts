import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type WeeklyBrandReportDocument = WeeklyBrandReport & Document;

@Schema({
  collection: 'weekly_reports',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, // Explicitly name timestamp fields
})
export class WeeklyBrandReport {
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
    type: Date, 
    required: true, 
    index: true 
  })
  weekStart: Date;

  @Prop({ 
    type: Object, 
    required: true,
    default: {} 
  })
  spontaneous: any;

  @Prop({ 
    type: Object, 
    required: true,
    default: {} 
  })
  sentiment: any;

  @Prop({ 
    type: Object, 
    required: true,
    default: {} 
  })
  comparison: any;

  @Prop({ 
    type: Object, 
    required: true,
    default: {} 
  })
  llmVersions: Record<string, string>;

  @Prop({ 
    type: Date, 
    required: true, 
    default: Date.now 
  })
  generatedAt: Date;
  
  @Prop({ type: Date })
  createdAt: Date;
  
  @Prop({ type: Date })
  updatedAt: Date;
}

export const WeeklyBrandReportSchema = SchemaFactory.createForClass(WeeklyBrandReport);

// Create a unique compound index for companyId and weekStart
WeeklyBrandReportSchema.index({ companyId: 1, weekStart: 1 }, { unique: true });