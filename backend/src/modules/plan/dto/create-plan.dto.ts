import { IsString, IsNumber, IsBoolean, IsArray, IsOptional, IsObject } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  tag: string;

  @IsString()
  subtitle: string;

  @IsArray()
  @IsString({ each: true })
  features: string[];

  @IsArray()
  @IsString({ each: true })
  included: string[];

  @IsString()
  stripeProductId: string;

  @IsNumber()
  maxModels: number;

  @IsNumber()
  maxBrands: number;

  @IsNumber()
  @IsOptional()
  maxMarkets?: number;

  @IsNumber()
  @IsOptional()
  maxSpontaneousPrompts?: number;

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
}