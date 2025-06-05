import { IsOptional, IsObject, IsArray, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @IsOptional()
  @IsObject()
  planSettings?: {
    maxProjects?: number;
    maxAIModels?: number;
    maxSpontaneousPrompts?: number;
    maxUrls?: number;
    maxUsers?: number;
    maxCompetitors?: number;
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedModels?: string[];
}