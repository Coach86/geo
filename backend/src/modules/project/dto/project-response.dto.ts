import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectResponseDto {
  @ApiProperty({ description: 'Unique identifier for the company' })
  id: string;

  @ApiProperty({ description: 'Optional custom name for the project', required: false })
  name?: string;

  @ApiProperty({ description: 'Company brand name' })
  brandName: string;

  @ApiProperty({ description: 'Company website URL' })
  website: string;

  @ApiProperty({ description: 'Company website URL (alias for website field)', required: false })
  url?: string;

  @ApiProperty({ description: 'Industry the company operates in' })
  industry: string;

  @ApiProperty({
    description: 'Geographical market the company operates in (e.g., "US", "Europe", "Global")',
  })
  market: string;

  @ApiPropertyOptional({
    description: 'Language for the project (e.g., "en", "fr", "es")',
  })
  language?: string;

  @ApiProperty({ description: 'Short description of the company' })
  shortDescription: string;

  @ApiProperty({ description: 'Full detailed description of the company' })
  fullDescription: string;

  @ApiProperty({
    description: 'Full detailed description of the company (alias for frontend)',
    required: false,
  })
  longDescription?: string;

  @ApiPropertyOptional({ description: 'Business objectives and goals of the company' })
  objectives?: string;

  @ApiProperty({ description: 'List of key features or offerings of the company', type: [String] })
  keyBrandAttributes: string[];

  @ApiPropertyOptional({ description: 'Keywords scraped from the website', type: [String] })
  scrapedKeywords?: string[];

  @ApiProperty({ description: 'List of competitors', type: [String] })
  competitors: string[];

  @ApiPropertyOptional({ 
    description: 'Detailed competitor information including websites', 
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        website: { type: 'string' }
      }
    }
  })
  competitorDetails?: Array<{
    name: string;
    website?: string;
  }>;

  @ApiProperty({ description: 'Logo URL', required: false })
  logo?: string;

  @ApiProperty({ description: 'Organization ID this project belongs to' })
  organizationId: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ 
    description: 'Next allowed timestamp for manual analysis trigger' 
  })
  nextManualAnalysisAllowedAt?: Date;
}
