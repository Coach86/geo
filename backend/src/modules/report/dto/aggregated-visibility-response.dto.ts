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

  @ApiProperty({ description: 'Number of reports included in aggregation' })
  reportCount: number;

  @ApiProperty({ description: 'Date range of included reports' })
  dateRange: {
    start: string;
    end: string;
  };
}