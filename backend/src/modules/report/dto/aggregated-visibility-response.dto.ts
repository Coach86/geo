import { ApiProperty } from '@nestjs/swagger';

export class VisibilityChartDataDto {
  @ApiProperty({ description: 'Date of the data point' })
  date: string;

  @ApiProperty({ description: 'Brand visibility score' })
  brand: number;

  @ApiProperty({ 
    description: 'Competitor visibility scores',
    type: 'object',
    additionalProperties: { type: 'number' }
  })
  competitors: Record<string, number>;
}

export class ModelBreakdownDto {
  @ApiProperty({ description: 'Model name' })
  model: string;

  @ApiProperty({ description: 'Average score for this model' })
  score: number;

  @ApiProperty({ description: 'Variation percentage compared to previous period' })
  variation: number;
}

export class CompetitorDataDto {
  @ApiProperty({ description: 'Competitor name' })
  name: string;

  @ApiProperty({ description: 'Average visibility score' })
  averageScore: number;

  @ApiProperty({ description: 'Variation percentage compared to previous period' })
  variation: number;
}

export class TopMentionDto {
  @ApiProperty({ description: 'Brand or competitor name' })
  mention: string;

  @ApiProperty({ description: 'Number of times mentioned' })
  count: number;

  @ApiProperty({ description: 'Percentage of total mentions' })
  percentage: number;
}

export class TopDomainDto {
  @ApiProperty({ description: 'Domain name' })
  domain: string;

  @ApiProperty({ description: 'Number of citations from this domain' })
  count: number;

  @ApiProperty({ description: 'Percentage of total citations' })
  percentage: number;
}

export class DomainSourceAnalysisDto {
  @ApiProperty({ description: 'Percentage of citations from brand domain' })
  brandDomainPercentage: number;

  @ApiProperty({ description: 'Percentage of citations from other sources' })
  otherSourcesPercentage: number;

  @ApiProperty({ description: 'Count of citations from brand domain' })
  brandDomainCount: number;

  @ApiProperty({ description: 'Count of citations from other sources' })
  otherSourcesCount: number;

  @ApiProperty({ 
    description: 'Breakdown of citations by competitor',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        count: { type: 'number' },
        percentage: { type: 'number' }
      }
    },
    required: false
  })
  competitorBreakdown?: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Count of citations from unknown sources', required: false })
  unknownSourcesCount?: number;

  @ApiProperty({ description: 'Percentage of citations from unknown sources', required: false })
  unknownSourcesPercentage?: number;
}

export class AggregatedVisibilityResponseDto {
  @ApiProperty({ description: 'Average visibility score across all selected reports and models' })
  averageScore: number;

  @ApiProperty({ description: 'Score variation percentage compared to previous period' })
  scoreVariation: number;

  @ApiProperty({ 
    description: 'List of available models in the data',
    type: [String]
  })
  availableModels: string[];

  @ApiProperty({ 
    description: 'Time series data for charts',
    type: [VisibilityChartDataDto]
  })
  chartData: VisibilityChartDataDto[];

  @ApiProperty({ 
    description: 'Breakdown by model',
    type: [ModelBreakdownDto]
  })
  modelBreakdown: ModelBreakdownDto[];

  @ApiProperty({ 
    description: 'Competitor analysis data',
    type: [CompetitorDataDto]
  })
  competitors: CompetitorDataDto[];

  @ApiProperty({ 
    description: 'Top mentioned brands with counts and percentages',
    type: [TopMentionDto]
  })
  topMentions: TopMentionDto[];

  @ApiProperty({ 
    description: 'Top domains from visibility citations',
    type: [TopDomainDto]
  })
  topDomains: TopDomainDto[];

  @ApiProperty({ description: 'Number of reports included in aggregation' })
  reportCount: number;

  @ApiProperty({ description: 'Date range of included reports' })
  dateRange: {
    start: string;
    end: string;
  };

  @ApiProperty({ description: 'Total number of prompts tested for visibility' })
  totalPromptsTested: number;

  @ApiProperty({ 
    description: 'Domain source analysis for visibility citations only',
    type: DomainSourceAnalysisDto,
    required: false
  })
  domainSourceAnalysis?: DomainSourceAnalysisDto;

  @ApiProperty({ 
    description: 'Detailed visibility results with citations',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        model: { type: 'string' },
        promptIndex: { type: 'number' },
        brandMentioned: { type: 'boolean' },
        originalPrompt: { type: 'string' },
        citations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              title: { type: 'string' },
              website: { type: 'string' },
              domain: { type: 'string' },
              brandMentioned: { type: 'boolean' },
              brandMentionContext: { type: 'string' }
            }
          }
        }
      }
    },
    required: false
  })
  detailedResults?: Array<{
    model: string;
    promptIndex: number;
    brandMentioned: boolean;
    originalPrompt: string;
    citations: Array<{
      url?: string;
      title?: string;
      website?: string;
      domain?: string;
      brandMentioned?: boolean;
      brandMentionContext?: string;
    }>;
  }>;
}