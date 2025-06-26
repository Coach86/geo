import { Controller, Get, Param, Req, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BatchResultRepository } from '../repositories/batch-result.repository';
import { BatchExecutionRepository } from '../repositories/batch-execution.repository';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';
import { BatchResultsByReportDto } from '../dto/batch-results-by-report.dto';

@ApiTags('User - Batch Results')
@Controller('batch-results')
export class PublicBatchResultsController {
  constructor(
    private readonly batchResultRepository: BatchResultRepository,
    private readonly batchExecutionRepository: BatchExecutionRepository,
    private readonly tokenService: TokenService,
  ) {}

  @Get('report/:reportId')
  @TokenRoute()
  @ApiOperation({ summary: 'Get batch results by report ID' })
  @ApiParam({ name: 'reportId', description: 'The ID of the report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return batch results for the report',
    type: BatchResultsByReportDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getBatchResultsByReport(
    @Req() request: any,
    @Param('reportId') reportId: string,
  ): Promise<BatchResultsByReportDto> {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    // For now, we'll return a placeholder since the relationship between reports and batch results
    // needs to be properly established in the new structure
    
    // TODO: Implement proper logic to get batch results by report ID
    // This likely requires looking up the report first to get the batch execution ID
    
    return {
      reportId,
      results: [],
      message: 'Batch results endpoint needs to be properly implemented with new report structure'
    };
  }
}