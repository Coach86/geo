import { ApiProperty } from '@nestjs/swagger';
import { AggregatedCitationsDto } from './citation-item.dto';

export class AlignmentChartDataDto {
  @ApiProperty({ description: 'Date of the data point' })
  date: string;

  @ApiProperty({ description: 'Alignment score' })
  score: number;

  @ApiProperty({ description: 'Report ID for reference' })
  reportId: string;
}

export class AttributeScoreDto {
  @ApiProperty({ description: 'Attribute name' })
  attribute: string;

  @ApiProperty({ description: 'Average score for this attribute' })
  score: number;

  @ApiProperty({ description: 'Variation percentage compared to previous period' })
  variation: number;
}

export class AggregatedAlignmentResponseDto {
  @ApiProperty({ description: 'Average alignment score across all selected reports and models' })
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
    type: [AlignmentChartDataDto]
  })
  chartData: AlignmentChartDataDto[];

  @ApiProperty({ 
    description: 'Aggregated scores by attribute',
    type: 'object',
    additionalProperties: { type: 'number' }
  })
  aggregatedAttributeScores: Record<string, number>;

  @ApiProperty({ 
    description: 'Detailed attribute scores with variations',
    type: [AttributeScoreDto]
  })
  attributeBreakdown: AttributeScoreDto[];

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