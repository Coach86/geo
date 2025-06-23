import { IsOptional, IsNumber, IsArray, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AggregatedReportQueryDto } from './aggregated-report-query.dto';

/**
 * Extended DTO for aggregated report queries with additional filtering options
 */
export class AggregatedReportQueryExtendedDto extends AggregatedReportQueryDto {
  @ApiPropertyOptional({ 
    description: 'Specific report IDs to include',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(v => v !== '');
    }
    return value;
  })
  reportIds?: string[];

  @ApiPropertyOptional({ 
    description: 'Maximum number of reports to fetch',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}