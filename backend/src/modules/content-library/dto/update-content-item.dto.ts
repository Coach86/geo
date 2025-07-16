import { PartialType } from '@nestjs/swagger';
import { CreateContentItemDto } from './create-content-item.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateContentItemDto extends PartialType(CreateContentItemDto) {
  @ApiProperty({ enum: ['pending', 'processed', 'failed'], required: false })
  @IsOptional()
  @IsEnum(['pending', 'processed', 'failed'])
  status?: 'pending' | 'processed' | 'failed';
}