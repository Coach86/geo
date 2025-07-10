import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class GeneratePromptsFromKeywordsDto {
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

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

  // Project context for when projectId is not provided
  @ApiProperty({
    description: 'Brand name',
    example: 'Acme Corporation',
    required: false,
  })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiProperty({
    description: 'Website URL',
    example: 'https://acme.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({
    description: 'Industry',
    example: 'Technology',
    required: false,
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({
    description: 'Target market',
    example: 'United States',
    required: false,
  })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiProperty({
    description: 'Language',
    example: 'English',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'Key brand attributes',
    example: ['Quality', 'Innovation', 'Customer Service'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyBrandAttributes?: string[];

  @ApiProperty({
    description: 'Competitors',
    example: ['Competitor A', 'Competitor B'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competitors?: string[];

  @ApiProperty({
    description: 'Short description',
    example: 'Leading provider of innovative solutions',
    required: false,
  })
  @IsOptional()
  @IsString()
  shortDescription?: string;
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