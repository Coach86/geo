import { ApiProperty } from '@nestjs/swagger';

export class CitationItemDto {
  @ApiProperty({ description: 'Domain of the citation source' })
  domain: string;

  @ApiProperty({ description: 'Full URL of the citation' })
  url: string;

  @ApiProperty({ description: 'Title of the cited content', required: false })
  title?: string;

  @ApiProperty({ description: 'The prompt/question that triggered this citation' })
  prompt: string;

  @ApiProperty({ 
    description: 'Sentiment for this citation (for sentiment feature)', 
    required: false,
    enum: ['positive', 'neutral', 'negative']
  })
  sentiment?: string;

  @ApiProperty({ 
    description: 'Alignment score for this citation (for alignment feature)', 
    required: false 
  })
  score?: number;

  @ApiProperty({ description: 'Number of times this domain was cited' })
  count: number;

  @ApiProperty({ description: 'Model that generated this citation', required: false })
  model?: string;

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