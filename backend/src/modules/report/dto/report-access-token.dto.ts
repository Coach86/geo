import { ApiProperty } from '@nestjs/swagger';

export class ValidateTokenResponseDto {
  @ApiProperty({ description: 'Indicates if the token is valid', example: true })
  valid: boolean;

  @ApiProperty({ description: 'ID of the report associated with this token', example: '60d21b4667d0d8992e610c85', required: false })
  reportId?: string;
  
  @ApiProperty({ description: 'ID of the company associated with this token', example: '60d21b4667d0d8992e610c80', required: false })
  companyId?: string;
}

export class ResendTokenRequestDto {
  @ApiProperty({ description: 'ID of the report to resend access for', example: '60d21b4667d0d8992e610c85' })
  reportId: string;
  
  @ApiProperty({ description: 'ID of the company the report belongs to', example: '60d21b4667d0d8992e610c80' })
  companyId: string;
}

export class ResendTokenResponseDto {
  @ApiProperty({ description: 'Indicates if the token was successfully sent', example: true })
  success: boolean;
  
  @ApiProperty({ description: 'Message about the operation result', example: 'Access link sent successfully' })
  message: string;
}

export class TokenDebugResponseDto {
  @ApiProperty({ description: 'The generated access token for debugging', example: '1a2b3c4d5e6f7g8h9i0j' })
  token: string;
  
  @ApiProperty({ description: 'The URL to access the report with this token', example: 'http://localhost:3000/report-access?token=1a2b3c4d5e6f7g8h9i0j' })
  accessUrl: string;
}