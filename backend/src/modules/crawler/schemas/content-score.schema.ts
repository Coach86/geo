import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface ScoreIssue {
  dimension: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  affectedElements?: string[];
}

export interface DimensionScores {
  authority: number;
  freshness: number;
  structure: number;
  snippetExtractability: number;
  brandAlignment: number;
}

export interface DimensionDetails {
  authority: {
    hasAuthor: boolean;
    authorCredentials: string[];
    outboundCitations: number;
    trustedCitations: string[];
  };
  freshness: {
    publishDate?: Date;
    modifiedDate?: Date;
    daysSinceUpdate?: number;
    hasDateSignals: boolean;
  };
  structure: {
    h1Count: number;
    headingHierarchy: boolean;
    schemaTypes: string[];
    avgSentenceWords: number;
  };
  snippet: {
    avgSentenceWords: number;
    listCount: number;
    qaBlockCount: number;
    extractableBlocks: number;
  };
  brand: {
    brandKeywordMatches: number;
    requiredTermsFound: string[];
    outdatedTermsFound: string[];
    brandConsistency: number;
  };
}

@Schema({ timestamps: true })
export class ContentScore extends Document {
  @Prop({ required: true, index: true })
  projectId: string;

  @Prop({ required: true, index: true })
  url: string;

  @Prop({ required: true, type: Object })
  scores: DimensionScores;

  @Prop({ required: true })
  globalScore: number;

  @Prop({ type: Object })
  details: DimensionDetails;

  @Prop({ type: [Object] })
  issues: ScoreIssue[];

  @Prop({ required: true })
  analyzedAt: Date;

  @Prop()
  crawledPageId: string;

  @Prop({ type: Object })
  scoringRulesVersion: {
    version: string;
    updatedAt: Date;
  };
}

export const ContentScoreSchema = SchemaFactory.createForClass(ContentScore);

// Indexes for efficient querying
ContentScoreSchema.index({ projectId: 1, analyzedAt: -1 });
ContentScoreSchema.index({ projectId: 1, globalScore: -1 });
ContentScoreSchema.index({ projectId: 1, url: 1 }, { unique: true });