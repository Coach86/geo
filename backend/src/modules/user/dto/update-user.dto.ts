import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, IsObject, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class PlanSettingsDto {
  @ApiProperty({
    description: 'Maximum number of brands allowed',
    example: 1,
  })
  @IsNumber()
  maxBrands: number;

  @ApiProperty({
    description: 'Maximum number of AI models allowed',
    example: 3,
  })
  @IsNumber()
  maxAIModels: number;
}

export class UpdateUserDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Preferred language for the user',
    example: 'en',
  })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({
    description: 'Phone number of the user',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, { 
    message: 'Phone number must be a valid international format (e.g., +1234567890)' 
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'Plan settings for the user',
    type: PlanSettingsDto,
    required: false,
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanSettingsDto)
  planSettings?: PlanSettingsDto;
}