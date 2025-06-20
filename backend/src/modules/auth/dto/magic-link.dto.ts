import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMagicLinkDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Optional promo code for trial activation',
    example: 'LAUNCH50',
  })
  @IsOptional()
  @IsString()
  promoCode?: string;
}

export class MagicLinkResponseDto {
  @ApiProperty({
    description: 'Whether the magic link was sent successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Magic link sent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;
}