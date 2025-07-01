import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DimensionCalculationDetails } from '../interfaces/score-calculation.interface';

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
    authorName?: string;
    authorCredentials: string[];
    outboundCitations: number;
    trustedCitations: string[];
    domainAuthority?: 'low' | 'medium' | 'high' | 'unknown';
    citationCount?: number;
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
    headingHierarchyScore?: number; // Score 0-100 for heading structure quality
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

export interface LLMAnalysisData {
  prompt: string;
  response: string;
  model: string;
  timestamp: Date;
  tokensUsed?: {
    input: number;
    output: number;
  };
  analysisType: 'unified' | 'static'; // unified = AI analysis, static = rule-based
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

  @Prop({ type: Object })
  calculationDetails?: DimensionCalculationDetails;

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

  @Prop({ type: Object })
  llmAnalysis?: LLMAnalysisData;

  @Prop()
  pageCategory?: string;

  @Prop()
  analysisLevel?: string;

  @Prop()
  categoryConfidence?: number;
}

export const ContentScoreSchema = SchemaFactory.createForClass(ContentScore);

// Indexes for efficient querying
ContentScoreSchema.index({ projectId: 1, analyzedAt: -1 });
ContentScoreSchema.index({ projectId: 1, globalScore: -1 });
ContentScoreSchema.index({ projectId: 1, url: 1 }, { unique: true });