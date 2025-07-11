import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, IsString } from 'class-validator';

export class UpdatePlanSettingsDto {
  @ApiPropertyOptional({ description: 'Plan ID reference' })
  @IsOptional()
  @IsString()
  _id?: string;
  @ApiPropertyOptional({ description: 'Maximum number of projects allowed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxProjects?: number;

  @ApiPropertyOptional({ description: 'Maximum number of AI models allowed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAIModels?: number;

  @ApiPropertyOptional({ description: 'Maximum number of spontaneous prompts allowed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSpontaneousPrompts?: number;

  @ApiPropertyOptional({ description: 'Maximum number of URLs allowed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUrls?: number;

  @ApiPropertyOptional({ description: 'Maximum number of users allowed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Maximum number of competitors allowed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCompetitors?: number;
}