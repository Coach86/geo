import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FindUsersQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter users by email (exact match)',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Filter users by organization ID',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}