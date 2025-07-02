import { ApiProperty } from '@nestjs/swagger';

export class BatchResultItemDto {
  @ApiProperty({ description: 'Result ID' })
  id: string;

  @ApiProperty({ 
    description: 'Type of result',
    enum: ['visibility', 'sentiment', 'competition', 'alignment']
  })
  resultType: string;

  @ApiProperty({ description: 'Result data', type: Object })
  result: any;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class BatchResultsByReportDto {
  @ApiProperty({ description: 'Report ID' })
  reportId: string;

  @ApiProperty({ 
    description: 'Batch results array', 
    type: [BatchResultItemDto] 
  })
  results: BatchResultItemDto[];

  @ApiProperty({ description: 'Response message' })
  message: string;
}