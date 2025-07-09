import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class GeneratePromptsFromKeywordsDto {
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Keywords to generate prompts from',
    example: ['AI monitoring', 'brand sentiment', 'customer feedback'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  keywords: string[];

  @ApiProperty({
    description: 'Additional instructions to guide prompt generation',
    example: 'Generate prompts for customer feedback analysis focused on sentiment and product quality',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalInstructions?: string;

  @ApiProperty({
    description: 'Type of prompts to generate',
    example: 'visibility',
    enum: ['visibility', 'sentiment', 'alignment', 'competition'],
  })
  @IsString()
  promptType: 'visibility' | 'sentiment' | 'alignment' | 'competition';

  @ApiProperty({
    description: 'Number of prompts to generate',
    example: 12,
    required: false,
  })
  @IsOptional()
  count?: number;
}

export class RegeneratePromptsDto {
  @ApiProperty({
    description: 'Number of prompts to generate',
    example: 12,
    required: false,
  })
  @IsOptional()
  count?: number;

  @ApiProperty({
    description: 'Additional instructions to guide prompt generation',
    example: 'Focus on technical aspects of the product',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalInstructions?: string;

  @ApiProperty({
    description: 'Keywords to incorporate in prompt generation',
    example: ['performance', 'scalability', 'reliability'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}