import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';

export type EvidenceDocument = Evidence & Document;

@Schema()
export class DataPoint {
  @Prop({ type: String, required: true })
  metric: string;

  @Prop({ type: Object, required: true })
  value: any;

  @Prop({ type: String, required: true })
  context: string;
}

const DataPointSchema = SchemaFactory.createForClass(DataPoint);

@Schema()
export class Evidence {
  @Prop({
    type: String,
    default: () => uuidv4(),
  })
  id: string;

  @Prop({
    type: String,
    enum: ['visibility_data', 'sentiment_data', 'alignment_data', 'competition_data', 'citation_analysis'],
    required: true,
  })
  type: string;

  @Prop({
    type: String,
    required: true,
  })
  source: string;

  @Prop({
    type: [DataPointSchema],
    required: true,
  })
  dataPoints: DataPoint[];

  @Prop({
    type: [String],
    default: [],
  })
  supportingQuotes: string[];

  @Prop({
    type: Number,
    required: true,
    min: 0,
    max: 1,
  })
  statisticalSignificance: number;

  @Prop({
    type: Date,
    default: Date.now,
  })
  collectedAt: Date;
}

export const EvidenceSchema = SchemaFactory.createForClass(Evidence);