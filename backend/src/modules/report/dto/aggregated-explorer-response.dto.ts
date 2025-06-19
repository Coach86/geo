import { ApiProperty } from '@nestjs/swagger';

export class ExplorerItemDto {
  @ApiProperty({ description: 'Item name (mention, keyword, or domain)' })
  name: string;

  @ApiProperty({ description: 'Total count across all reports' })
  count: number;

  @ApiProperty({ description: 'Percentage of total', required: false })
  percentage?: number;
}

export class AggregatedExplorerResponseDto {
  @ApiProperty({ 
    description: 'Top mentions aggregated across reports',
    type: [ExplorerItemDto]
  })
  topMentions: ExplorerItemDto[];

  @ApiProperty({ 
    description: 'Top keywords aggregated across reports',
    type: [ExplorerItemDto]
  })
  topKeywords: ExplorerItemDto[];

  @ApiProperty({ 
    description: 'Top sources aggregated across reports',
    type: [ExplorerItemDto]
  })
  topSources: ExplorerItemDto[];

  @ApiProperty({ description: 'Summary statistics' })
  summary: {
    totalPrompts: number;
    promptsWithWebAccess: number;
    webAccessPercentage: number;
    totalCitations: number;
    uniqueSources: number;
  };

  @ApiProperty({ description: 'Number of reports included in aggregation' })
  reportCount: number;

  @ApiProperty({ description: 'Date range of aggregated reports' })
  dateRange: {
    start: string;
    end: string;
  };
}