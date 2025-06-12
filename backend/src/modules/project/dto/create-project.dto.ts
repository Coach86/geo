import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsUrl,
  IsOptional,
  ValidateNested,
  IsString,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';

export class PromptsDto {
  @ApiPropertyOptional({ description: 'Visibility prompts', type: [String] })
  @IsOptional()
  @IsArray()
  visibility?: string[];

  @ApiPropertyOptional({ description: 'Sentiment prompts', type: [String] })
  @IsOptional()
  @IsArray()
  sentiment?: string[];

  @ApiPropertyOptional({ description: 'Alignment prompts', type: [String] })
  @IsOptional()
  @IsArray()
  alignment?: string[];

  @ApiPropertyOptional({ description: 'Competition prompts', type: [String] })
  @IsOptional()
  @IsArray()
  competition?: string[];
}

export class ProjectDataDto {
  @ApiPropertyOptional({ description: 'Optional project name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Company brand name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  brandName?: string;

  @ApiPropertyOptional({ description: 'Company website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Industry the company operates in' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Geographical market the company operates in (e.g., "US", "Europe", "Global")',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  market?: string;

  @ApiPropertyOptional({
    description: 'Language for the identity card (e.g., "en", "fr", "es")',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ description: 'Short description of the company' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  shortDescription?: string;

  @ApiPropertyOptional({ description: 'Full detailed description of the company' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullDescription?: string;

  @ApiPropertyOptional({ description: 'Business objectives and goals of the company' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  objectives?: string;

  @ApiPropertyOptional({
    description: 'List of key features or offerings of the company',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  keyBrandAttributes?: string[];

  @ApiPropertyOptional({ description: 'List of competitors', type: [String] })
  @IsOptional()
  @IsArray()
  competitors?: string[];

  @ApiPropertyOptional({
    description: 'Custom prompts for different analysis types',
    type: PromptsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PromptsDto)
  prompts?: PromptsDto;
}

export class CreateProjectDto {
  @ApiPropertyOptional({ description: 'URL to scrape company information from' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({
    description: 'Company data to use instead of URL scraping',
    type: ProjectDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectDataDto)
  data?: ProjectDataDto;

  @ApiProperty({ description: 'Organization ID to associate this project with' })
  @IsString()
  organizationId: string;
}
