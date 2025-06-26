import { ApiProperty } from '@nestjs/swagger';

export class BatchResultsByReportDto {
  @ApiProperty({ description: 'Report ID' })
  reportId: string;

  @ApiProperty({ description: 'Batch results array', type: [Object] })
  results: any[];

  @ApiProperty({ description: 'Message about the implementation status' })
  message: string;
}