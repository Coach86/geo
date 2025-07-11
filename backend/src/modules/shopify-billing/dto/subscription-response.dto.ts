import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  interval: string;

  @ApiProperty({ required: false })
  trialDays?: number;

  @ApiProperty({ required: false })
  trialEndsOn?: string;

  @ApiProperty({ required: false })
  activatedOn?: string;

  @ApiProperty({ required: false })
  cancelledOn?: string;

  @ApiProperty()
  test: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ required: false })
  confirmationUrl?: string;
}

export class UsageChargeResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  balanceUsed: string;

  @ApiProperty()
  balanceRemaining: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class BillingStatusResponseDto {
  @ApiProperty()
  hasActiveSubscription: boolean;

  @ApiProperty({ required: false })
  currentPlan?: SubscriptionResponseDto;

  @ApiProperty({ type: [SubscriptionResponseDto] })
  subscriptions: SubscriptionResponseDto[];

  @ApiProperty({ required: false })
  shopifyCustomerId?: string;

  @ApiProperty({ required: false })
  shop?: string;
}

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

  @ApiProperty({ required: false, type: [String] })
  features?: string[];

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}