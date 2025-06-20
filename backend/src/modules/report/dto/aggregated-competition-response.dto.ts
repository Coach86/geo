import { ApiProperty } from '@nestjs/swagger';
import { AggregatedCitationsDto } from './citation-item.dto';

export class CompetitorInsightDto {
  @ApiProperty({ description: 'Competitor name' })
  competitor: string;

  @ApiProperty({ description: 'Total number of strengths identified' })
  strengthsCount: number;

  @ApiProperty({ description: 'Total number of weaknesses identified' })
  weaknessesCount: number;

  @ApiProperty({ description: 'Top strengths mentioned across models', type: [String] })
  topStrengths: string[];

  @ApiProperty({ description: 'Top weaknesses mentioned across models', type: [String] })
  topWeaknesses: string[];
}

export class CompetitionChartDataDto {
  @ApiProperty({ description: 'Date of the data point' })
  date: string;

  @ApiProperty({ description: 'Competitor performance metrics by competitor name' })
  competitors: Record<string, {
    strengthsCount: number;
    weaknessesCount: number;
  }>;

  @ApiProperty({ description: 'Report ID for reference' })
  reportId: string;
}

export class AggregatedCompetitionResponseDto {
  @ApiProperty({ description: 'Brand name' })
  brandName: string;

  @ApiProperty({ description: 'List of competitors analyzed' })
  competitors: string[];

  @ApiProperty({ 
    description: 'List of available models in the data',
    type: [String]
  })
  availableModels: string[];

  @ApiProperty({ 
    description: 'Aggregated insights by competitor',
    type: [CompetitorInsightDto]
  })
  competitorInsights: CompetitorInsightDto[];

  @ApiProperty({ 
    description: 'Common strengths across all competitors',
    type: [String]
  })
  commonStrengths: string[];

  @ApiProperty({ 
    description: 'Common weaknesses across all competitors',
    type: [String]
  })
  commonWeaknesses: string[];

  @ApiProperty({ 
    description: 'Time series data for charts',
    type: [CompetitionChartDataDto]
  })
  chartData: CompetitionChartDataDto[];

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