import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUrl, IsString, IsOptional } from 'class-validator';

export class CreateFromUrlDto {
  @ApiProperty({ description: 'URL to scrape company information from' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Organization ID to associate this project with' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Geographical market the company operates in (e.g., "US", "Europe", "Global")' })
  @IsString()
  market: string;

  @ApiPropertyOptional({ description: 'Language for the identity card (e.g., "en", "fr", "es")' })
  @IsOptional()
  @IsString()
  language?: string;
}