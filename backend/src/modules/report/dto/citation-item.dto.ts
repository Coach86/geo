import { ApiProperty } from '@nestjs/swagger';

export class CitationItemDto {
  @ApiProperty({ description: 'Domain of the citation source' })
  domain: string;

  @ApiProperty({ description: 'Full URL of the citation' })
  url: string;

  @ApiProperty({ description: 'Title of the cited content', required: false })
  title?: string;

  @ApiProperty({ 
    description: 'The prompts/questions that triggered this citation',
    type: [String]
  })
  prompts: string[];

  @ApiProperty({ 
    description: 'Sentiments for this citation (for sentiment feature)', 
    required: false,
    type: [String]
  })
  sentiments?: string[];

  @ApiProperty({ 
    description: 'Alignment scores for this citation (for alignment feature)', 
    required: false,
    type: [Number]
  })
  scores?: number[];

  @ApiProperty({ description: 'Number of times this URL was cited' })
  count: number;

  @ApiProperty({ 
    description: 'Models that generated citations for this URL',
    type: [String]
  })
  models: string[];

  @ApiProperty({ description: 'Cited text snippet', required: false })
  text?: string;
}

export class AggregatedCitationsDto {
  @ApiProperty({ 
    description: 'List of aggregated citations',
    type: [CitationItemDto]
  })
  items: CitationItemDto[];

  @ApiProperty({ description: 'Total number of unique domains' })
  uniqueDomains: number;

  @ApiProperty({ description: 'Total number of citations' })
  totalCitations: number;
}