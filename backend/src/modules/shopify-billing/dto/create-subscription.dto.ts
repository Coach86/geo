import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Name of the subscription plan' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Price of the subscription' })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ description: 'Currency code (default: USD)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ 
    description: 'Billing interval',
    enum: ['monthly', 'annual'],
  })
  @IsEnum(['monthly', 'annual'])
  interval: 'monthly' | 'annual';

  @ApiPropertyOptional({ description: 'Number of trial days' })
  @IsOptional()
  @IsNumber()
  trialDays?: number;

  @ApiPropertyOptional({ description: 'Test mode flag' })
  @IsOptional()
  @IsBoolean()
  test?: boolean;

  @ApiPropertyOptional({ description: 'Plan features' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

export class ActivateChargeDto {
  @ApiProperty({ description: 'Shopify charge ID' })
  @IsNumber()
  chargeId: number;
}

export class CreateUsageChargeDto {
  @ApiProperty({ description: 'Description of the usage charge' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Amount to charge' })
  @IsNumber()
  price: number;
}

export class ShopifySessionDto {
  @ApiProperty({ description: 'Shopify shop domain' })
  @IsString()
  shop: string;

  @ApiProperty({ description: 'Shopify access token' })
  @IsString()
  accessToken: string;
}