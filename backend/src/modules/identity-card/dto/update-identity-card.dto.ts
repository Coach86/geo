import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateIdentityCardDto {
  @ApiProperty({
    description: 'Key features or strengths of the company',
    example: ['Feature 1', 'Feature 2', 'Feature 3'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keyBrandAttributes?: string[];

  @ApiProperty({
    description: 'Competitors of the company',
    example: ['Competitor 1', 'Competitor 2', 'Competitor 3'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  competitors?: string[];

  @ApiProperty({
    description: 'Geographical market the company operates in',
    example: 'US',
    required: false,
  })
  @IsString()
  @IsOptional()
  market?: string;
}
