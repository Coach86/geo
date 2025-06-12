import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdatePromptSetDto {
  @ApiProperty({ 
    description: 'Visibility mention prompts',
    example: ['What companies in {industry} can you name?'],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  visibility?: string[];

  @ApiProperty({ 
    description: 'Sentiment analysis prompts',
    example: ['What do you think about {COMPANY}?'],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sentiment?: string[];

  @ApiProperty({ 
    description: 'Competition analysis prompts',
    example: ['Compare {COMPANY} with {COMPETITORS}'],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  competition?: string[];

  @ApiProperty({ 
    description: 'Alignment evaluation prompts',
    example: ['What are the key products or services of {COMPANY}?'],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  alignment?: string[];
  
  // Brand battle field removed - merged into competition
}