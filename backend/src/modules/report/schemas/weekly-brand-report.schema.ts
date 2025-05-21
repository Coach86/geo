import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type WeeklyBrandReportDocument = WeeklyBrandReport & Document;

@Schema({
  collection: 'weekly_reports',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class WeeklyBrandReport {
  @Prop({
    type: String,
    default: () => uuidv4(),
    index: true,
  })
  id: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  companyId: string;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  weekStart: Date;

  @Prop({
    type: Date,
    required: true,
    default: Date.now,
  })
  generatedAt: Date;

  @Prop({
    type: String,
    required: false,
    index: true,
  })
  batchExecutionId: string;

  @Prop({
    type: String,
    required: false,
  })
  brand: string;

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  metadata: {
    url: string;
    market: string;
    flag: string;
    competitors: string;
    date: string;
    models: string;
  };

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  kpi: {
    pulse: {
      value: string;
      description: string;
    };
    tone: {
      value: string;
      status: string;
      description: string;
    };
    accord: {
      value: string;
      status: string;
      description: string;
    };
    arena: {
      competitors: string[];
      description: string;
    };
  };

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  pulse: {
    promptsTested: number;
    modelVisibility: Array<{
      model: string;
      value: number;
    }>;
  };

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  tone: {
    sentiments: Array<{
      model: string;
      sentiment: string;
      status: string;
      positiveKeywords: string[];
      negativeKeywords: string[];
    }>;
    questions: Array<{
      question: string;
      results: Array<{
        model: string;
        sentiment: string;
        status: string;
        positiveKeywords: string[];
        negativeKeywords: string[];
      }>;
    }>;
  };

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  accord: {
    attributes: Array<{
      name: string;
      rate: string;
      alignment: string;
    }>;
    score: {
      value: string;
      status: string;
    };
  };

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  arena: {
    competitors: Array<{
      name: string;
      chatgpt: number;
      claude: number;
      mistral: number;
      gemini: number;
      global: string;
      size: string;
      sentiment: string;
    }>;
  };

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  brandBattle: {
    competitorAnalyses: {
      competitor: string;
      analysisByModel: {
        model: string;
        strengths: string[];
        weaknesses: string[];
      }[];
    }[];
    commonStrengths: string[];
    commonWeaknesses: string[];
  };

  // Original data fields for backward compatibility
  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  spontaneous: any;

  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  sentiment: any;

  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  comparison: any;

  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  llmVersions: Record<string, string>;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const WeeklyBrandReportSchema = SchemaFactory.createForClass(WeeklyBrandReport);
