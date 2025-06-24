import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganizationDto } from './create-organization.dto';
import { IsOptional, IsString, IsDate, IsBoolean } from 'class-validator';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  @IsOptional()
  @IsString()
  stripeCustomerId?: string;

  @IsOptional()
  @IsString()
  stripePlanId?: string;

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
}