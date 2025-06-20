import { ApiProperty } from '@nestjs/swagger';

export class ExplorerItemDto {
  @ApiProperty({ description: 'Item name (mention, keyword, or domain)' })
  name: string;

  @ApiProperty({ description: 'Total count across all reports' })
  count: number;

  @ApiProperty({ description: 'Percentage of total', required: false })
  percentage?: number;
}

export class CitationDto {
  @ApiProperty({ description: 'Website domain' })
  website: string;

  @ApiProperty({ description: 'Full URL link', required: false })
  link?: string;

  @ApiProperty({ description: 'Model that generated this citation' })
  model: string;

  @ApiProperty({ description: 'Type of prompt' })
  promptType: string;

  @ApiProperty({ description: 'Index of the prompt' })
  promptIndex: number;

  @ApiProperty({ description: 'Source information', required: false })
  source?: string;
}

export class WebSearchResultDto {
  @ApiProperty({ description: 'Search query' })
  query: string;

  @ApiProperty({ description: 'Timestamp of the search', required: false })
  timestamp?: string;

  @ApiProperty({ description: 'Models used for this search' })
  models: string[];

  @ApiProperty({ description: 'Prompt types used' })
  promptTypes: string[];

  @ApiProperty({ 
    description: 'Citations found for this search',
    type: [CitationDto]
  })
  citations: CitationDto[];
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

  @ApiProperty({ 
    description: 'All web search results with citations',
    type: [WebSearchResultDto],
    required: false
  })
  webSearchResults?: WebSearchResultDto[];

  @ApiProperty({ description: 'Number of reports included in aggregation' })
  reportCount: number;

  @ApiProperty({ description: 'Date range of aggregated reports' })
  dateRange: {
    start: string;
    end: string;
  };
}