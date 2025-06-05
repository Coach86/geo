import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Preferred language for the user',
    example: 'en',
    default: 'en',
  })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({
    description: 'Organization ID (set automatically when created by organization)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  organizationId?: string;
}