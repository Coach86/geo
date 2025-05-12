import { ApiProperty } from '@nestjs/swagger';

export class CompanyIdentityCard {
  @ApiProperty({ description: 'Unique identifier for the company' })
  companyId: string;

  @ApiProperty({ description: 'Company brand name' })
  brandName: string;

  @ApiProperty({ description: 'Company website URL' })
  website: string;

  @ApiProperty({ description: 'Industry the company operates in' })
  industry: string;

  @ApiProperty({ description: 'Short description of the company' })
  shortDescription: string;

  @ApiProperty({ description: 'Full detailed description of the company' })
  fullDescription: string;

  @ApiProperty({ description: 'List of key features or offerings of the company', type: [String] })
  keyFeatures: string[];

  @ApiProperty({ description: 'List of competitors', type: [String] })
  competitors: string[];

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}