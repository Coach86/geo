import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
} from 'class-validator';

export enum BillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class CreateSubscriptionProductDto {
  @ApiProperty({ example: 'Pro Plan' })
  @IsString()
  name: string;

  @ApiProperty({ example: 19.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ enum: BillingInterval, default: BillingInterval.MONTHLY })
  @IsEnum(BillingInterval)
  @IsOptional()
  interval?: BillingInterval = BillingInterval.MONTHLY;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiProperty({ example: 14, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  trialDays?: number;

  @ApiProperty({ 
    example: ['Unlimited projects', 'Premium support', 'API access'],
    required: false 
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean = true;

  @ApiProperty({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  test?: boolean = false;
}

export class UpdateSubscriptionProductDto extends PartialType(CreateSubscriptionProductDto) {}

export class SubscriptionProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  interval: string;

  @ApiProperty()
  currency: string;

  @ApiProperty({ required: false })
  trialDays?: number;

  @ApiProperty({ required: false })
  features?: string[];

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}