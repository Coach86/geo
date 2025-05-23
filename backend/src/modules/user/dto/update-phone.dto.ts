import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePhoneDto {
  @ApiProperty({ 
    description: 'User phone number', 
    example: '+1234567890',
    pattern: '^\\+?[1-9]\\d{1,14}$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, { 
    message: 'Phone number must be a valid international format (e.g., +1234567890)' 
  })
  phoneNumber: string;
}