import { IsOptional, IsDateString, IsArray, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AggregatedReportQueryDto {
  @ApiPropertyOptional({ description: 'Start date for the report range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for the report range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by specific models',
    type: [String],
    example: ['gpt-4o', 'claude-3-5-sonnet']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Handle empty string case (when models= is sent without values)
      if (value === '') {
        return [];
      }
      return value.split(',').map(v => v.trim()).filter(v => v !== '');
    }
    return value;
  })
  models?: string[];

  @ApiPropertyOptional({ 
    description: 'Include variation calculation comparing to previous period',
    default: true 
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeVariation?: boolean = true;

  @ApiPropertyOptional({ 
    description: 'Return only the latest report instead of aggregating by date range',
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  latestOnly?: boolean = false;
}