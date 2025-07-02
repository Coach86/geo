import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DomainAnalysisDocument = DomainAnalysis & Document;

/**
 * Schema for storing domain-level analysis results
 * This represents the analysis done once per domain rather than per page
 */
@Schema({ 
  timestamps: true,
  collection: 'domain_analyses'
})
export class DomainAnalysis {
  @Prop({ required: true, index: true })
  domain: string;

  @Prop({ required: true, index: true })
  projectId: string;

  @Prop({ type: Object, required: true })
  analysisResults: {
    authority: {
      score: number;
      maxScore: number;
      evidence: string[];
      details: Record<string, any>;
      issues: Array<{
        severity: 'critical' | 'high' | 'medium' | 'low';
        description: string;
        recommendation: string;
      }>;
    };
    // Future domain-level dimensions can be added here
    // freshness?: { ... };
    // structure?: { ... };
    // brandAlignment?: { ... };
  };

  @Prop({ type: [Object], required: true })
  ruleResults: Array<{
    ruleId: string;
    ruleName: string;
    dimension: string;
    score: number;
    maxScore: number;
    weight: number;
    contribution: number;
    passed: boolean;
    evidence: string[];
    details: Record<string, any>;
    issues?: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
    }>;
  }>;

  @Prop({ required: true })
  overallScore: number;

  @Prop({ type: Object, required: true })
  calculationDetails: {
    totalWeight: number;
    weightedScore: number;
    finalScore: number;
    dimensionBreakdown: Record<string, {
      score: number;
      weight: number;
      contribution: number;
    }>;
  };

  @Prop({ type: [String] })
  issues: string[];

  @Prop({ type: [String] })
  recommendations: string[];

  @Prop({ type: Object })
  metadata: {
    totalPages: number;
    pagesAnalyzed: string[]; // URLs of pages included in domain analysis
    analysisStartedAt: Date;
    analysisCompletedAt: Date;
    llmCallsMade: number;
  };

  @Prop({ default: Date.now, expires: '30d' }) // TTL: 30 days
  expiresAt: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const DomainAnalysisSchema = SchemaFactory.createForClass(DomainAnalysis);

// Create compound index for efficient queries
DomainAnalysisSchema.index({ domain: 1, projectId: 1 }, { unique: true });
DomainAnalysisSchema.index({ projectId: 1, createdAt: -1 });
DomainAnalysisSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });