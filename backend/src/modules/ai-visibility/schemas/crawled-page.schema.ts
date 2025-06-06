import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CrawledPageDocument = CrawledPage & Document;

@Schema({ timestamps: true })
export class CrawledPage {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true, type: String, ref: 'Project' })
  projectId: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  title: string;

  @Prop()
  h1: string;

  @Prop()
  metaDescription: string;

  @Prop()
  canonicalUrl: string;

  @Prop({ type: [String] })
  headings: string[];

  @Prop({ type: Object })
  metadata: {
    keywords?: string[];
    author?: string;
    publishedDate?: Date;
    modifiedDate?: Date;
    language?: string;
  };

  @Prop({ default: 0 })
  crawlDepth: number;

  @Prop()
  parentUrl: string;

  @Prop({ type: [String] })
  outboundLinks: string[];

  @Prop({ type: [String] })
  internalLinks: string[];

  @Prop({ default: 'success', enum: ['success', 'error', 'skipped'] })
  status: string;

  @Prop()
  errorMessage?: string;

  @Prop({ required: true })
  crawledAt: Date;

  @Prop()
  contentHash: string;

  @Prop({ default: 0 })
  wordCount: number;
}

export const CrawledPageSchema = SchemaFactory.createForClass(CrawledPage);