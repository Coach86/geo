import { IsString, IsNumber, IsBoolean, IsArray, IsOptional, IsObject, Min, IsEnum } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  tag: string;

  @IsString()
  subtitle: string;

  @IsArray()
  @IsString({ each: true })
  included: string[];

  @IsString()
  stripeProductId: string;

  @IsNumber()
  maxModels: number;

  @IsNumber()
  maxProjects: number;

  @IsNumber()
  @Min(-1)
  maxUsers: number;

  @IsNumber()
  @IsOptional()
  maxUrls?: number;

  @IsNumber()
  @IsOptional()
  maxSpontaneousPrompts?: number;

  @IsNumber()
  @IsOptional()
  maxCompetitors?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isRecommended?: boolean;

  @IsBoolean()
  @IsOptional()
  isMostPopular?: boolean;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsEnum(['daily', 'weekly', 'unlimited'])
  @IsOptional()
  refreshFrequency?: string;

  @IsNumber()
  @IsOptional()
  shopifyMonthlyPrice?: number;

  @IsNumber()
  @IsOptional()
  shopifyAnnualPrice?: number;

  @IsNumber()
  @IsOptional()
  shopifyTrialDays?: number;
}