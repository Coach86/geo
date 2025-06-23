import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  IsObject,
  ValidateNested,
  IsNumber,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class PlanSettingsDto {
  @ApiProperty({
    description: 'Maximum number of projects allowed',
    example: 1,
  })
  @IsNumber()
  maxProjects: number;

  @ApiProperty({
    description: 'Maximum number of AI models allowed',
    example: 3,
  })
  @IsNumber()
  maxAIModels: number;

  @ApiProperty({
    description: 'Maximum number of spontaneous prompts allowed',
    example: 12,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maxSpontaneousPrompts?: number;

  @ApiProperty({
    description: 'Maximum number of unique URLs allowed',
    example: 1,
  })
  @IsNumber()
  maxUrls: number;
}

export class UpdateUserDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Preferred language for the user',
    example: 'en',
  })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({
    description: 'Phone number of the user',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid international format (e.g., +1234567890)',
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'Plan settings for the user',
    type: PlanSettingsDto,
    required: false,
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanSettingsDto)
  planSettings?: PlanSettingsDto;

  @ApiProperty({
    description: 'Array of selected AI model IDs from config.json',
    example: ['openai-gpt4o', 'anthropic-claude3.7sonnet'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @ArrayMaxSize(10, { message: 'Cannot select more than 10 models' })
  selectedModels?: string[];

  @ApiProperty({
    description: 'Stripe plan ID for the user',
    example: 'manual',
    required: false,
  })
  @IsString()
  @IsOptional()
  stripePlanId?: string;

  @ApiProperty({
    description: 'Organization ID for the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({
    description: 'Shopify shop domain (for Shopify app users)',
    example: 'myshop.myshopify.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  shopifyShopDomain?: string;

  @ApiProperty({
    description: 'Shopify shop ID (for Shopify app users)',
    example: '12345678',
    required: false,
  })
  @IsString()
  @IsOptional()
  shopifyShopId?: string;

  @ApiProperty({
    description: 'Authentication type',
    example: 'shopify',
    enum: ['standard', 'shopify'],
    required: false,
  })
  @IsString()
  @IsOptional()
  authType?: string;
}
