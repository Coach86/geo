import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface PageMetadata {
  title: string;
  description: string;
  author?: string;
  publishDate?: Date;
  modifiedDate?: Date;
  schema: Record<string, unknown>[];
  canonicalUrl?: string;
  lang?: string;
}

@Schema({ timestamps: true })
export class CrawledPage extends Document {
  @Prop({ required: true, index: true })
  projectId: string;

  @Prop({ required: true, index: true })
  url: string;

  @Prop({ required: true })
  html: string;

  @Prop({ required: true })
  crawledAt: Date;

  @Prop({ required: true })
  statusCode: number;

  @Prop({ type: Object })
  headers: Record<string, string>;

  @Prop({ type: Object })
  metadata: PageMetadata;

  @Prop()
  contentHash: string;

  @Prop()
  responseTimeMs: number;

  @Prop()
  errorMessage?: string;

  @Prop({ default: false })
  isProcessed: boolean;
}

export const CrawledPageSchema = SchemaFactory.createForClass(CrawledPage);

// Compound index for efficient querying
CrawledPageSchema.index({ projectId: 1, crawledAt: -1 });
CrawledPageSchema.index({ projectId: 1, url: 1 }, { unique: true });