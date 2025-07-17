import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganizationDto } from './create-organization.dto';
import { IsOptional, IsString, IsDate, IsBoolean, ValidateIf, IsIn } from 'class-validator';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  @IsOptional()
  @IsString()
  stripeCustomerId?: string;

  @IsOptional()
  @ValidateIf((o) => o.stripePlanId !== null)
  @IsString()
  stripePlanId?: string | null;

  @IsOptional()
  @IsString()
  stripeSubscriptionId?: string;

  @IsOptional()
  @IsString()
  subscriptionStatus?: string;

  @IsOptional()
  @IsDate()
  subscriptionCurrentPeriodEnd?: Date;

  @IsOptional()
  @IsBoolean()
  hasActivatedFreePlan?: boolean;

  @IsOptional()
  @IsDate()
  freePlanActivatedAt?: Date;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsDate()
  subscriptionCancelAt?: Date;

  @IsOptional()
  @IsString()
  shopifyAccessToken?: string;

  @IsOptional()
  @IsString()
  shopifySubscriptionId?: string;

  @IsOptional()
  shopifySubscriptionData?: any;

  @IsOptional()
  shopifyShopData?: any;

  @IsOptional()
  @IsIn(['daily', 'weekly', 'unlimited'])
  refreshFrequencyOverride?: 'daily' | 'weekly' | 'unlimited';
}