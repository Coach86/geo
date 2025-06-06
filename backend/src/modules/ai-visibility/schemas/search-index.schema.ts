import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SearchIndexDocument = SearchIndex & Document;

export interface IndexChunk {
  id: string;
  content: string;
  metadata: {
    url: string;
    title?: string;
    heading?: string;
    pageId: string;
    position: number;
  };
  embedding?: number[];
}

@Schema({ timestamps: true })
export class SearchIndex {
  @Prop({ required: true, type: String, ref: 'Project' })
  projectId: string;

  @Prop({ required: true, enum: ['bm25', 'vector', 'hybrid'] })
  indexType: string;

  @Prop({ required: true })
  version: string;

  @Prop({ type: Object })
  configuration: {
    chunkSize?: number;
    chunkOverlap?: number;
    embeddingModel?: string;
    dimension?: number;
    k1?: number;
    b?: number;
  };

  @Prop({ default: 0 })
  chunkCount: number;

  @Prop({ default: 0 })
  documentCount: number;

  @Prop({ type: [Object] })
  chunks: IndexChunk[];

  @Prop({ type: Object })
  bm25Data?: {
    corpus?: string[][];
    lunrIndex?: string;
    documentFrequencies: any;
    averageDocumentLength: number;
    totalDocuments?: number;
  };

  @Prop({ type: Object })
  vectorData?: {
    embeddings: number[][];
    indexPath?: string;
    hnswParams?: {
      space: string;
      dimension: number;
      efConstruction: number;
      M: number;
    };
  };

  @Prop({ default: 'building', enum: ['building', 'ready', 'error', 'outdated'] })
  status: string;

  @Prop()
  errorMessage?: string;

  @Prop()
  buildStartedAt: Date;

  @Prop()
  buildCompletedAt: Date;

  @Prop({ type: [Types.ObjectId], ref: 'CrawledPage' })
  sourcePages: Types.ObjectId[];

  @Prop({ type: Object })
  statistics: {
    averageChunkLength?: number;
    vocabularySize?: number;
    totalTokens?: number;
  };
}

export const SearchIndexSchema = SchemaFactory.createForClass(SearchIndex);