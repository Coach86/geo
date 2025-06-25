import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidatePromoCodeDto {
  @ApiProperty({ description: 'Promo code to validate' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Plan ID to check validity against' })
  @IsString()
  @IsOptional()
  planId?: string;

  @ApiPropertyOptional({ description: 'User ID to check if already used' })
  @IsString()
  @IsOptional()
  userId?: string;
}

export class PromoCodeValidationResponseDto {
  @ApiProperty()
  valid: boolean;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  promoCode?: {
    code: string;
    discountType: string;
    discountValue: number;
    durationType: string;
    durationInMonths?: number;
    trialPlanId?: string;
    description?: string;
    validPlanIds?: string[];
  };
}