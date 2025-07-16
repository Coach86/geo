import { IsNumber, IsArray, IsEnum, Min, Max, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGenerationJobDto {
  @ApiProperty({ 
    description: 'Number of articles to generate',
    minimum: 1,
    maximum: 10,
    default: 1,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  numberOfArticles: number = 1;

  @ApiProperty({
    description: 'Types of articles to generate',
    example: ['blog', 'news', 'tutorial'],
    default: ['blog'],
  })
  @IsArray()
  @ArrayMinSize(1)
  articleTypes: string[] = ['blog'];

  @ApiProperty({
    description: 'Target length for generated articles',
    enum: ['short', 'medium', 'long'],
    default: 'medium',
  })
  @IsEnum(['short', 'medium', 'long'])
  targetLength: 'short' | 'medium' | 'long' = 'medium';
}