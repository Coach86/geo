import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReportEmailDto {
  @ApiProperty({ description: 'The ID of the report to send', example: '60d21b4667d0d8992e610c85' })
  @IsString()
  @IsNotEmpty()
  reportId: string;
  
  @ApiProperty({ description: 'The ID of the company the report belongs to', example: '60d21b4667d0d8992e610c80' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ description: 'The email address to send the report to', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
  
  @ApiProperty({ description: 'Optional custom subject for the email', example: 'Your Custom Brand Report', required: false })
  @IsString()
  @IsOptional()
  subject?: string;
}

export class CompanyReportsResponseDto {
  @ApiProperty({ description: 'Array of reports for the company' })
  reports: {
    id: string;
    weekStart: Date;
    generatedAt: Date;
  }[];
  
  @ApiProperty({ description: 'Total number of reports found' })
  total: number;
}