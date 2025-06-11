import { ApiProperty } from '@nestjs/swagger';

export class BrandReportResponseDto {
  @ApiProperty({ description: 'Unique identifier for the report' })
  id: string;

  @ApiProperty({ description: 'Project ID this report is associated with' })
  projectId: string;

  @ApiProperty({ description: 'Report date' })
  reportDate: Date;

  @ApiProperty({ description: 'When the report was generated' })
  generatedAt: Date;

  @ApiProperty({ description: 'Brand name' })
  brandName: string;

  @ApiProperty({ description: 'Report metadata' })
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

  @ApiProperty({ description: 'Explorer data - citations and web access' })
  explorer: {
    summary: {
      totalPrompts: number;
      promptsWithWebAccess: number;
      webAccessPercentage: number;
      totalCitations: number;
      uniqueSources: number;
    };
    topMentions: { mention: string; count: number }[];
    topKeywords: { keyword: string; count: number; percentage: number }[];
    topSources: { domain: string; count: number; percentage: number }[];
    citations: {
      website: string;
      link?: string;
      model: string;
      promptType: string;
      promptIndex: number;
      promptText?: string;
      webSearchQueries?: { query: string; timestamp?: string }[];
    }[];
    webAccess: {
      totalResponses: number;
      successfulQueries: number;
      failedQueries: number;
    };
  };

  @ApiProperty({ description: 'Visibility data - brand mention rates' })
  visibility: {
    overallMentionRate: number;
    promptsTested: number;
    modelVisibility: {
      model: string;
      mentionRate: number;
    }[];
    arenaMetrics: {
      model: string;
      mentions: number;
      score: number;
      rank: number;
    }[];
  };

  @ApiProperty({ description: 'Sentiment data - tone analysis' })
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
  };

  @ApiProperty({ description: 'Alignment data - brand attribute alignment' })
  alignment: {
    overallAlignmentScore: number;
    averageAttributeScores: Record<string, number>;
    attributeAlignmentSummary: {
      name: string;
      mentionRate: string;
      alignment: string;
    }[];
    detailedResults: {
      model: string;
      attributeScores: {
        attribute: string;
        score: number;
        evaluation: string;
      }[];
    }[];
  };

  @ApiProperty({ description: 'Competition data - competitor analysis' })
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
  };
}