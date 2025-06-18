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
    description: 'Organization ID this user belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Timestamp when the user last connected',
    example: '2023-01-01T00:00:00.000Z',
    required: false,
  })
  lastConnectionAt?: string;

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
    description: 'Array of project IDs associated with this user',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  projectIds?: string[];

  @ApiProperty({
    description: 'Shopify shop domain (for Shopify app users)',
    example: 'myshop.myshopify.com',
    required: false,
  })
  shopifyShopDomain?: string;

  @ApiProperty({
    description: 'Shopify shop ID (for Shopify app users)',
    example: '12345678',
    required: false,
  })
  shopifyShopId?: string;

  @ApiProperty({
    description: 'Authentication type',
    example: 'shopify',
    enum: ['standard', 'shopify'],
    required: false,
  })
  authType?: string;
}