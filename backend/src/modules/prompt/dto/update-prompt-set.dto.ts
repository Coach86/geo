import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdatePromptSetDto {
  @ApiProperty({ 
    description: 'Spontaneous mention prompts',
    example: ['What companies in {industry} can you name?'],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  spontaneous?: string[];

  @ApiProperty({ 
    description: 'Direct sentiment prompts',
    example: ['What do you think about {COMPANY}?'],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  direct?: string[];

  @ApiProperty({ 
    description: 'Competitor comparison prompts',
    example: ['Compare {COMPANY} with {COMPETITORS}'],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  comparison?: string[];

  @ApiProperty({ 
    description: 'Accuracy evaluation prompts',
    example: ['What are the key products or services of {COMPANY}?'],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accuracy?: string[];
}