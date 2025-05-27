import {
  Controller,
  Get,
  Param,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';
import { BatchResultRepository } from '../repositories/batch-result.repository';
import { ReportRetrievalService } from '../../report/services/report-retrieval.service';

@ApiTags('public-batch-results')
@Controller('batch-results')
@UseInterceptors(ClassSerializerInterceptor)
export class PublicBatchResultsController {
  private readonly logger = new Logger(PublicBatchResultsController.name);

  constructor(
    @Inject(TokenService) private readonly tokenService: TokenService,
    private readonly batchResultRepository: BatchResultRepository,
    private readonly reportRetrievalService: ReportRetrievalService,
  ) {}

  @Get('report/:reportId')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Get batch results for a report using a token' })
  @ApiParam({ name: 'reportId', description: 'The ID of the report' })
  @ApiQuery({ name: 'token', description: 'The access token to validate' })
  @ApiResponse({
    status: 200,
    description: 'Batch results retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  async getBatchResultsForReport(
    @Param('reportId') reportId: string,
    @Query('token') queryToken?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    try {
      this.logger.log(`Getting batch results for report ${reportId}`);

      // Extract token from query parameter or Authorization header
      let token = queryToken;
      if (!token && authHeader) {
        // Extract token from "Bearer <token>" format
        const match = authHeader.match(/^Bearer\s+(.+)$/);
        if (match) {
          token = match[1];
        }
      }

      // Validate token if provided
      if (token) {
        const isValid = await this.tokenService.validateAccessToken(token);
        if (!isValid.valid) {
          throw new UnauthorizedException('Invalid or expired token');
        }
      }

      // Get the report to verify it exists and get batch execution ID
      const report = await this.reportRetrievalService.getReportById(reportId);
      
      if (!report) {
        throw new NotFoundException('Report not found');
      }

      this.logger.log(`Report ${reportId} found with batchExecutionId: ${report.batchExecutionId}`);

      // Check if report has batch execution ID
      if (!report.batchExecutionId) {
        this.logger.warn(`Report ${reportId} has no batch execution ID, returning empty results`);
        return [];
      }

      // Get batch results associated with this report's batch execution as lean objects
      const batchResults = await this.batchResultRepository.findAllByExecutionIdLean(
        report.batchExecutionId,
      );

      this.logger.log(`Found ${batchResults.length} batch results for report ${reportId}`);
      return batchResults;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error getting batch results for report ${reportId}:`, error);
      throw new NotFoundException('Report not found');
    }
  }
}