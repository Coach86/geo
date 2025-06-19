import { IsString, IsEnum, IsNumber, IsOptional, IsArray, IsBoolean, IsDateString, Min, Max, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType, DurationType } from '../schemas/promo-code.schema';

export class CreatePromoCodeDto {
  @ApiProperty({ description: 'Unique promo code (will be converted to uppercase)' })
  @IsString()
  code: string;

  @ApiProperty({ enum: DiscountType, description: 'Type of discount' })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ description: 'Discount value (percentage 0-100, fixed amount in cents, or trial days)' })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ enum: DurationType, default: DurationType.ONCE })
  @IsEnum(DurationType)
  @IsOptional()
  durationType?: DurationType;

  @ApiPropertyOptional({ description: 'Duration in months (only for "months" duration type)' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  durationInMonths?: number;

  @ApiPropertyOptional({ description: 'Plan IDs this promo is valid for (empty = all plans)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  validPlanIds?: string[];

  @ApiPropertyOptional({ description: 'Plan ID to use during trial (for trial types)' })
  @IsString()
  @IsOptional()
  trialPlanId?: string;

  @ApiPropertyOptional({ description: 'Maximum number of uses (-1 for unlimited)', default: -1 })
  @IsNumber()
  @Min(-1)
  @IsOptional()
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Date when promo code becomes valid' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Date when promo code expires' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Whether the promo code is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Description of the promo code' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}