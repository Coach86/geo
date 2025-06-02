import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectResponseDto {
  @ApiProperty({ description: 'Unique identifier for the company' })
  id: string;

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

  @ApiProperty({ description: 'List of key features or offerings of the company', type: [String] })
  keyBrandAttributes: string[];

  @ApiProperty({ description: 'List of competitors', type: [String] })
  competitors: string[];

  @ApiProperty({ description: 'Logo URL', required: false })
  logo?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'ID of the user who owns this company', nullable: true })
  userId?: string | null;

  @ApiPropertyOptional({ description: 'Email of the user who owns this company', nullable: true })
  userEmail?: string | null;

  @ApiPropertyOptional({
    description: 'Language preference of the user who owns this company',
    nullable: true,
  })
  userLanguage?: string | null;
}
