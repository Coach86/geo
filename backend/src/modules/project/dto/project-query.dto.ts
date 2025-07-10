import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ProjectQueryDto extends PaginationDto {
  @ApiProperty({
    description: 'Filter projects by organization ID',
    required: false,
    example: 'c5e12120-24c5-4046-a4d6-3dae90166a4c'
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}