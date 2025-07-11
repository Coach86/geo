import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanSubscriptionDto {
  @ApiProperty({ description: 'Plan ID from the plans collection' })
  @IsString()
  planId: string;

  @ApiProperty({ 
    description: 'Billing interval',
    enum: ['monthly', 'annual'],
  })
  @IsEnum(['monthly', 'annual'])
  interval: 'monthly' | 'annual';

  @ApiPropertyOptional({ description: 'Test mode flag' })
  @IsOptional()
  @IsBoolean()
  test?: boolean;
}