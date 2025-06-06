import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum QuerySource {
  MANUAL = 'manual',
  GENERATED = 'generated',
  SEARCH_CONSOLE = 'search_console',
}

export class ScanConfigDto {
  @ApiPropertyOptional({ description: 'Manual queries to test' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  queries?: string[];

  @ApiProperty({ 
    description: 'Source of queries for the scan',
    enum: QuerySource 
  })
  @IsEnum(QuerySource)
  querySource: QuerySource;

  @ApiPropertyOptional({ description: 'Number of results to retrieve per query' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(50)
  maxResults?: number;

  @ApiPropertyOptional({ description: 'Use hybrid search (BM25 + Vector)' })
  @IsOptional()
  @IsBoolean()
  useHybridSearch?: boolean;

  @ApiPropertyOptional({ description: 'Number of queries to generate (if using generated source)' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  generateQueryCount?: number;
}

export class ExecuteScanDto {
  @ApiProperty({ description: 'Scan configuration', type: ScanConfigDto })
  @ValidateNested()
  @Type(() => ScanConfigDto)
  config: ScanConfigDto;
}