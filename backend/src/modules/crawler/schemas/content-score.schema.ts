import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DimensionCalculationDetails } from '../interfaces/score-calculation.interface';
import { RuleResult } from '../interfaces/rule.interface';

export interface ScoreIssue {
  dimension: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  affectedElements?: string[];
}

// Legacy interfaces - kept for migration purposes
export interface DimensionScores {
  // Old dimensions removed - use aeoScores instead
}

export interface DimensionDetails {
  // Old dimension details removed - use aeoRuleResults instead
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

export interface LLMCall {
  purpose: string; // e.g., 'page_categorization', 'authority_analysis', 'unified_analysis'
  prompt: string;
  response: string;
  model: string;
  timestamp: Date;
  tokensUsed?: {
    input: number;
    output: number;
  };
  error?: string;
}

@Schema({ timestamps: true })
export class ContentScore extends Document {
  @Prop({ required: true, index: true })
  projectId: string;

  @Prop({ required: true, index: true })
  url: string;

  // Legacy fields - will be removed after migration
  @Prop({ type: Object })
  legacyScores?: DimensionScores;

  @Prop({ type: Object })
  details?: DimensionDetails;

  // Primary scores (formerly AEO scores)
  @Prop({ required: true, type: Object })
  scores: {
    technical: number;
    content: number;
    authority: number;
    monitoringKpi: number;
  };

  @Prop({ required: true })
  globalScore: number;

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

  @Prop({ type: [Object] })
  llmCalls?: LLMCall[];

  @Prop()
  pageCategory?: string;

  @Prop()
  analysisLevel?: string;

  @Prop()
  categoryConfidence?: number;

  @Prop()
  skipped?: boolean;

  @Prop()
  skipReason?: string;

  // AEO fields are now primary (moved above)

  @Prop()
  pageType?: string;

  @Prop({ type: [Object] })
  ruleResults?: RuleResult[];

  @Prop({ type: [String] })
  recommendations?: string[]; // Aggregated recommendations from all rules

  @Prop({ type: Object })
  pageSignals?: any;
}

export const ContentScoreSchema = SchemaFactory.createForClass(ContentScore);

// Indexes for efficient querying
ContentScoreSchema.index({ projectId: 1, analyzedAt: -1 });
ContentScoreSchema.index({ projectId: 1, globalScore: -1 });
ContentScoreSchema.index({ projectId: 1, url: 1 }, { unique: true });
ContentScoreSchema.index({ projectId: 1, 'scores.technical': -1 });
ContentScoreSchema.index({ projectId: 1, 'scores.content': -1 });
ContentScoreSchema.index({ projectId: 1, 'scores.authority': -1 });
ContentScoreSchema.index({ projectId: 1, 'scores.monitoringKpi': -1 });