import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsArray, IsString, IsEnum } from 'class-validator';

export class TriggerCrawlDto {
  @ApiProperty({ description: 'Maximum number of pages to crawl', required: false, default: 100 })
  @IsOptional()
  @IsNumber()
  maxPages?: number;

  @ApiProperty({ description: 'Delay between crawl requests in milliseconds', required: false, default: 1000 })
  @IsOptional()
  @IsNumber()
  crawlDelay?: number;

  @ApiProperty({ description: 'URL patterns to include in crawl', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @ApiProperty({ description: 'URL patterns to exclude from crawl', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];

  @ApiProperty({ description: 'Custom User-Agent string for the crawler', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'Crawl mode: auto for automatic discovery, manual for specific URLs', required: false, enum: ['auto', 'manual'] })
  @IsOptional()
  @IsEnum(['auto', 'manual'])
  mode?: 'auto' | 'manual';

  @ApiProperty({ description: 'Manual URLs to crawl (only used when mode is manual)', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  manualUrls?: string[];
}