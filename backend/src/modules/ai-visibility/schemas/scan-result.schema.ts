import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScanResultDocument = ScanResult & Document;

export interface QueryResult {
  query: string;
  intent: 'informational' | 'navigational' | 'transactional';
  bm25Results: {
    documents: Array<{
      url: string;
      score: number;
      snippet: string;
    }>;
    found: boolean;
  };
  vectorResults: {
    documents: Array<{
      url: string;
      score: number;
      snippet: string;
    }>;
    found: boolean;
  };
  hybridResults?: {
    documents: Array<{
      url: string;
      score: number;
      source: 'bm25' | 'vector' | 'both';
    }>;
  };
  overlap: number;
  mrr: {
    bm25: number;
    vector: number;
    hybrid?: number;
  };
}

export interface CoverageMetrics {
  bm25Coverage: number;
  vectorCoverage: number;
  hybridCoverage: number;
  queriesWithNoResults: string[];
  queriesWithPerfectOverlap: string[];
}

export interface VisibilityPattern {
  type: 'high_bm25_low_vector' | 'high_vector_low_bm25' | 'both_low' | 'both_high';
  affectedQueries: string[];
  percentage: number;
}

@Schema({ timestamps: true })
export class ScanResult {
  @Prop({ required: true, type: String, ref: 'Project' })
  projectId: string;

  @Prop({ required: true })
  scanId: string;

  @Prop({ type: [String] })
  queries: string[];

  @Prop({ type: [Object] })
  queryResults: QueryResult[];

  @Prop({ type: Object, required: true })
  coverageMetrics: CoverageMetrics;

  @Prop({ type: [Object] })
  visibilityPatterns: VisibilityPattern[];

  @Prop({ type: Object })
  overallStats: {
    averageOverlap: number;
    averageMrrBm25: number;
    averageMrrVector: number;
    averageMrrHybrid?: number;
    totalQueries: number;
    successfulQueries: number;
  };

  @Prop({ type: [Object] })
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    type: string;
    title: string;
    description: string;
    impact: string;
    effort: string;
    affectedPages: string[];
  }>;

  @Prop({ type: Object })
  configuration: {
    maxResults: number;
    useHybridSearch: boolean;
    querySource: 'manual' | 'generated' | 'search_console';
  };

  @Prop({ default: 'running', enum: ['running', 'completed', 'failed'] })
  status: string;

  @Prop()
  errorMessage?: string;

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  completedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'SearchIndex' })
  bm25IndexId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SearchIndex' })
  vectorIndexId: Types.ObjectId;
}

export const ScanResultSchema = SchemaFactory.createForClass(ScanResult);