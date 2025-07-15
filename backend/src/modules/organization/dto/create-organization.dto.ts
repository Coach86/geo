import { IsOptional, IsObject, IsArray, IsString, IsNotEmpty, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    required: true,
    example: 'My Company',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Shopify shop domain (for Shopify app users)',
    required: false,
    example: 'myshop.myshopify.com',
  })
  @IsString()
  @IsOptional()
  shopifyShopDomain?: string;
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

  @IsOptional()
  @ValidateIf((o) => o.stripePlanId !== null)
  @IsString()
  stripePlanId?: string | null;
}