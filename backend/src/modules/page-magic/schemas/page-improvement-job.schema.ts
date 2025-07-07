import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Document } from 'mongoose';

export type PageImprovementJobDocument = HydratedDocument<PageImprovementJob>;

@Schema()
export class ImprovementIteration {
  @Prop({ required: true })
  iteration: number;

  @Prop({ required: true })
  improvedContent: string;

  @Prop()
  improvedContentMarkdown?: string;

  @Prop()
  improvedTitle?: string;

  @Prop()
  improvedMetaDescription?: string;

  @Prop({ type: Object })
  improvedMetas?: {
    description?: string;
    keywords?: string;
    [key: string]: string | undefined;
  };

  @Prop({ required: true })
  scoreBefore: number;

  @Prop({ required: true })
  scoreAfter: number;

  @Prop({ type: [String], default: [] })
  issues: string[];

  @Prop({ type: [String], default: [] })
  recommendations: string[];

  @Prop({ default: Date.now })
  timestamp: Date;
}

const ImprovementIterationSchema = SchemaFactory.createForClass(ImprovementIteration);

@Schema()
export class RuleResult {
  @Prop({ required: true })
  ruleId: string;

  @Prop()
  ruleName?: string;

  @Prop({ required: true })
  dimension: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  recommendation: string;

  @Prop({ required: true })
  improvedContent: string;

  @Prop()
  improvedTitle?: string;

  @Prop({ type: Object })
  improvedMetas?: {
    description?: string;
    keywords?: string;
    [key: string]: string | undefined;
  };

  @Prop({ required: true })
  scoreBefore: number;

  @Prop({ required: true })
  scoreAfter: number;

  @Prop({ type: [String], default: [] })
  changes: string[];

  @Prop()
  model?: string;

  @Prop({ type: Object })
  tokensUsed?: {
    input: number;
    output: number;
  };

  @Prop()
  retryCount?: number;

  @Prop({ default: Date.now })
  timestamp: Date;
}

const RuleResultSchema = SchemaFactory.createForClass(RuleResult);

@Schema({ timestamps: true })
export class PageImprovementJob {
  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true })
  pageUrl: string;

  @Prop({ required: true })
  originalContent: string;

  @Prop()
  originalContentMarkdown?: string;

  @Prop()
  originalTitle?: string;

  @Prop()
  originalMetaDescription?: string;

  @Prop()
  improvedContent?: string;

  @Prop()
  improvedContentMarkdown?: string;

  @Prop()
  improvedTitle?: string;

  @Prop({ type: Object })
  improvedMetas?: {
    description?: string;
    keywords?: string;
    [key: string]: string | undefined;
  };

  @Prop({ type: [ImprovementIterationSchema], default: [] })
  improvements: ImprovementIteration[];

  @Prop({ type: [RuleResultSchema], default: [] })
  ruleResults: RuleResult[];

  @Prop({ type: [Object], default: [] })
  rules: Array<{
    id: string;
    ruleId?: string;
    ruleName?: string;
    dimension: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
    currentScore: number;
    affectedElements?: string[];
  }>;

  @Prop({ 
    required: true, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  })
  status: string;

  @Prop({ default: 0 })
  currentIteration: number;

  @Prop({ default: 3 })
  maxIterations: number;

  @Prop({ type: [Object], default: [] })
  errors: Array<{
    message: string;
    timestamp: Date;
    stack?: string;
  }>;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  userId?: string;

  @Prop()
  contentScoreId?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const PageImprovementJobSchema = SchemaFactory.createForClass(PageImprovementJob);

// Create indexes for better performance
PageImprovementJobSchema.index({ projectId: 1, pageUrl: 1 });
PageImprovementJobSchema.index({ status: 1 });
PageImprovementJobSchema.index({ createdAt: 1 });

// TTL index to automatically clean up old jobs after 30 days
PageImprovementJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });