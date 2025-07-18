import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CompetitionSchema } from './competition.schema';

export type BrandReportDocument = BrandReport & Document;

@Schema({
  collection: 'brand_reports',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class BrandReport {
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
  projectId: string;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  reportDate: Date;

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
    required: true,
  })
  brandName: string;

  @Prop({
    type: Object,
    required: true,
  })
  metadata: {
    url: string;
    market: string;
    countryCode: string;
    competitors: string[];
    modelsUsed: string[];
    promptsExecuted: number;
    executionContext: {
      batchId?: string;
      pipeline: string;
      version: string;
    };
  };

  @Prop({
    type: Object,
    required: true,
  })
  explorer: {
    summary: {
      totalPrompts: number;
      promptsWithWebAccess: number;
      webAccessPercentage: number;
      totalCitations: number;
      uniqueSources: number;
    };
    topKeywords: {
      keyword: string;
      count: number;
      percentage: number;
    }[];
    topSources: {
      domain: string;
      count: number;
      percentage: number;
    }[];
    citations: {
      website: string;
      link?: string;
      model: string;
      promptType: string;
      promptIndex: number;
      promptText?: string;
      brandMentioned?: boolean;
      brandMentionContext?: string;
      webSearchQueries?: {
        query: string;
        timestamp?: string;
      }[];
    }[];
    webAccess: {
      totalResponses: number;
      successfulQueries: number;
      failedQueries: number;
    };
    domainSourceAnalysis?: {
      brandDomainPercentage: number;
      otherSourcesPercentage: number;
      brandDomainCount: number;
      otherSourcesCount: number;
      competitorBreakdown?: Array<{
        name: string;
        count: number;
        percentage: number;
      }>;
      unknownSourcesCount?: number;
      unknownSourcesPercentage?: number;
    };
    brandMentionMetrics?: {
      citationsWithBrandMentions: number;
      totalCitationsAnalyzed: number;
      brandMentionRate: number;
      topDomainsWithBrandMentions: {
        domain: string;
        mentionCount: number;
        totalCount: number;
        mentionRate: number;
      }[];
      brandMentionsByModel: {
        model: string;
        mentionCount: number;
        totalCitations: number;
        mentionRate: number;
      }[];
    };
  };

  @Prop({
    type: Object,
    required: true,
  })
  visibility: {
    overallMentionRate: number;
    promptsTested: number;
    modelVisibility: {
      model: string;
      mentionRate: number;
    }[];
    arenaMetrics: {
      name: string;
      global: string;
      modelsMentionsRate?: {
        model: string;
        mentionsRate: number;
      }[];
    }[];
    topMentions?: {
      mention: string;
      count: number;
    }[];
    topDomains?: {
      domain: string;
      count: number;
      percentage: number;
    }[];
    detailedResults?: {
      model: string;
      promptIndex: number;
      brandMentioned: boolean;
      extractedCompanies: string[];
      originalPrompt: string;
      llmResponse: string;
      usedWebSearch: boolean;
      citations: {
        url: string;
        title?: string;
        text?: string;
      }[];
      toolUsage: {
        type: string;
        parameters?: Record<string, unknown>;
        execution_details?: {
          status: string;
          result?: unknown;
          error?: string;
        };
      }[];
    }[];
  };

  @Prop({
    type: Object,
    required: true,
  })
  sentiment: {
    overallScore: number;
    overallSentiment: string;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      total: number;
    };
    modelSentiments: {
      model: string;
      sentiment: string;
      status: string;
      positiveKeywords: string[];
      negativeKeywords: string[];
    }[];
    heatmapData: {
      question: string;
      results: {
        model: string;
        sentiment: string;
        status: string;
        llmResponse?: string;
      }[];
    }[];
    detailedResults?: {
      model: string;
      promptIndex: number;
      originalPrompt: string;
      llmResponse: string;
      sentimentBreakdown: {
        positive: number;
        neutral: number;
        negative: number;
      };
      overallSentiment: 'positive' | 'neutral' | 'negative';
      keywords: {
        positive: string[];
        negative: string[];
      };
      citations: {
        url: string;
        title?: string;
        text?: string;
      }[];
      toolUsage: {
        type: string;
        parameters?: Record<string, unknown>;
        execution_details?: {
          status: string;
          result?: unknown;
          error?: string;
        };
      }[];
    }[];
  };

  @Prop({
    type: Object,
    required: true,
  })
  alignment: {
    summary?: {
      overallAlignmentScore: number;
      averageAttributeScores: Record<string, number>;
      attributeAlignmentSummary: {
        name: string;
        mentionRate: string;
        alignment: string;
      }[];
    };
    detailedResults?: {
      model: string;
      promptIndex: number;
      originalPrompt: string;
      llmResponse: string;
      attributeScores: {
        attribute: string;
        score: number;
        evaluation: string;
      }[];
      citations: {
        url: string;
        title?: string;
        text?: string;
      }[];
      toolUsage: {
        type: string;
        parameters?: Record<string, unknown>;
        execution_details?: {
          status: string;
          result?: unknown;
          error?: string;
        };
      }[];
    }[];
  };

  @Prop({
    type: CompetitionSchema,
    required: true,
  })
  competition: {
    brandName: string;
    competitors: string[];
    competitorAnalyses: {
      competitor: string;
      analysisByModel: {
        model: string;
        strengths: string[];
        weaknesses: string[];
      }[];
    }[];
    competitorMetrics: {
      competitor: string;
      overallRank: number;
      mentionRate: number;
      modelMentions: {
        model: string;
        rank: number;
        mentionRate: number;
      }[];
    }[];
    commonStrengths: string[];
    commonWeaknesses: string[];
    detailedResults?: {
      model: string;
      promptIndex: number;
      competitor: string;
      originalPrompt: string;
      llmResponse: string;
      brandStrengths: string[];
      brandWeaknesses: string[];
      usedWebSearch: boolean;
      citations: {
        url: string;
        title?: string;
        text?: string;
      }[];
      toolUsage: {
        type: string;
        parameters?: Record<string, unknown>;
        execution_details?: {
          status: string;
          result?: unknown;
          error?: string;
        };
      }[];
    }[];
  };

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const BrandReportSchema = SchemaFactory.createForClass(BrandReport);