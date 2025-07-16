import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateArticleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ 
    enum: ['draft', 'reviewed', 'published'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['draft', 'reviewed', 'published'])
  status?: 'draft' | 'reviewed' | 'published';
}