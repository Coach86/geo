import { IsString, IsNumber, IsArray, IsOptional, IsUrl, Min, Max, IsBoolean, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CrawlConfigDto {
  @ApiProperty({ description: 'Maximum number of pages to crawl' })
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxPages: number;

  @ApiProperty({ description: 'Maximum crawl depth from the root URL' })
  @IsNumber()
  @Min(0)
  @Max(5)
  maxDepth: number;

  @ApiPropertyOptional({ description: 'Allowed domains for crawling' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional({ description: 'URL patterns to exclude' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];

  @ApiPropertyOptional({ description: 'Whether to respect robots.txt' })
  @IsOptional()
  @IsBoolean()
  respectRobotsTxt?: boolean;

  @ApiPropertyOptional({ description: 'Crawl delay in milliseconds between requests' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  crawlDelay?: number;

  @ApiPropertyOptional({ description: 'User agent string for crawling' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class StartCrawlDto {
  @ApiProperty({ description: 'Root URL to start crawling from' })
  @IsUrl()
  rootUrl: string;

  @ApiProperty({ description: 'Crawl configuration', type: CrawlConfigDto })
  @ValidateNested()
  @Type(() => CrawlConfigDto)
  config: CrawlConfigDto;
}