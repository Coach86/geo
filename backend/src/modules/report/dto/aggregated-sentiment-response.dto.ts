import { ApiProperty } from '@nestjs/swagger';
import { AggregatedCitationsDto } from './citation-item.dto';

export class SentimentChartDataDto {
  @ApiProperty({ description: 'Date of the data point' })
  date: string;

  @ApiProperty({ description: 'Positive sentiment percentage' })
  positive: number;

  @ApiProperty({ description: 'Neutral sentiment percentage' })
  neutral: number;

  @ApiProperty({ description: 'Negative sentiment percentage' })
  negative: number;
}

export class SentimentBreakdownDto {
  @ApiProperty({ description: 'Sentiment type (positive, neutral, negative)' })
  type: string;

  @ApiProperty({ description: 'Percentage of this sentiment' })
  percentage: number;

  @ApiProperty({ description: 'Variation percentage compared to previous period' })
  variation: number;
}

export class AggregatedSentimentResponseDto {
  @ApiProperty({ description: 'Average positive sentiment percentage' })
  positivePercentage: number;

  @ApiProperty({ description: 'Average neutral sentiment percentage' })
  neutralPercentage: number;

  @ApiProperty({ description: 'Average negative sentiment percentage' })
  negativePercentage: number;

  @ApiProperty({ description: 'Sentiment score variation percentage compared to previous period' })
  sentimentVariation: {
    positive: number;
    neutral: number;
    negative: number;
  };

  @ApiProperty({ 
    description: 'List of available models in the data',
    type: [String]
  })
  availableModels: string[];

  @ApiProperty({ 
    description: 'Time series data for charts',
    type: [SentimentChartDataDto]
  })
  chartData: SentimentChartDataDto[];

  @ApiProperty({ 
    description: 'Sentiment breakdown with variations',
    type: [SentimentBreakdownDto]
  })
  sentimentBreakdown: SentimentBreakdownDto[];

  @ApiProperty({ description: 'Number of reports included in aggregation' })
  reportCount: number;

  @ApiProperty({ description: 'Date range of included reports' })
  dateRange: {
    start: string;
    end: string;
  };

  @ApiProperty({ 
    description: 'Aggregated citations from all reports',
    type: AggregatedCitationsDto,
    required: false
  })
  citations?: AggregatedCitationsDto;
}