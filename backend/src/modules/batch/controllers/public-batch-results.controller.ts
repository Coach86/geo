import { Controller, Get, Param, Req, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BatchResultRepository } from '../repositories/batch-result.repository';
import { BatchExecutionRepository } from '../repositories/batch-execution.repository';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';
import { BatchResultsByReportDto } from '../dto/batch-results-by-report.dto';
import { BrandReportService } from '../../report/services/brand-report.service';
import { UserService } from '../../user/services/user.service';
import { ProjectService } from '../../project/services/project.service';

@ApiTags('User - Batch Results')
@Controller('batch-results')
export class PublicBatchResultsController {
  constructor(
    private readonly batchResultRepository: BatchResultRepository,
    private readonly batchExecutionRepository: BatchExecutionRepository,
    private readonly tokenService: TokenService,
    private readonly brandReportService: BrandReportService,
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
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
    // Get user ID from the request (set by TokenAuthGuard)
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate that the user has access to this report
    // This will throw if the user doesn't have access
    const reportDoc = await this.brandReportService.validateReportAccess(reportId, userId);
    
    if (!reportDoc.batchExecutionId) {
      return {
        reportId,
        results: [],
        message: 'No batch execution associated with this report'
      };
    }

    // Get batch results for this execution
    const batchResults = await this.batchResultRepository.findAllByExecutionId(
      reportDoc.batchExecutionId
    );

    // Transform results to match the DTO structure
    const results = batchResults.map(result => ({
      id: result.id,
      resultType: result.resultType,
      result: result.result,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }));

    return {
      reportId,
      results,
      message: 'Success'
    };
  }
}