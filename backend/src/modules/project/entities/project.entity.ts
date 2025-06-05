import { ApiProperty } from '@nestjs/swagger';

export class Project {
  @ApiProperty({ description: 'Unique identifier for the project' })
  projectId: string;

  @ApiProperty({ description: 'Optional custom name for the project', required: false })
  name?: string;

  @ApiProperty({ description: 'Company brand name' })
  brandName: string;

  @ApiProperty({ description: 'Company website URL' })
  website: string;

  @ApiProperty({ description: 'Industry the company operates in' })
  industry: string;

  @ApiProperty({
    description: 'Geographical market the company operates in (e.g., "US", "Europe", "Global")',
  })
  market: string;

  @ApiProperty({ description: 'Short description of the company' })
  shortDescription: string;

  @ApiProperty({ description: 'Full detailed description of the company' })
  fullDescription: string;

  @ApiProperty({ description: 'List of key features or offerings of the company', type: [String] })
  keyBrandAttributes: string[];

  @ApiProperty({ description: 'List of competitors', type: [String] })
  competitors: string[];

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'ID of the organization that owns this project' })
  organizationId: string;

  @ApiProperty({ description: 'Language of the project', nullable: true })
  language: string;
}
