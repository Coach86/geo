import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Preferred language for the user',
    example: 'en',
  })
  language: string;

  @ApiProperty({
    description: 'Phone number of the user',
    example: '+1234567890',
    required: false,
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'Stripe customer ID',
    example: 'cus_123456789',
    required: false,
  })
  stripeCustomerId?: string;

  @ApiProperty({
    description: 'Stripe plan ID',
    example: 'plan_123456789',
    required: false,
  })
  stripePlanId?: string;

  @ApiProperty({
    description: 'Plan ID reference',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  planId?: string;

  @ApiProperty({
    description: 'Plan settings including limits',
    example: { maxBrands: 1, maxAIModels: 3, maxSpontaneousPrompts: 12 },
  })
  planSettings: {
    maxBrands: number;
    maxAIModels: number;
    maxSpontaneousPrompts?: number;
  };

  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when the user was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Array of company IDs associated with this user',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  companyIds?: string[];
}