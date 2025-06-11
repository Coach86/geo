import { Controller, Get, Param, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BrandReportService } from '../services/brand-report.service';
import { BrandReportResponseDto } from '../dto/brand-report-response.dto';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';

@ApiTags('brand-reports')
@Controller('brand-reports')
export class BrandReportController {
  constructor(
    private readonly brandReportService: BrandReportService,
    private readonly tokenService: TokenService
  ) {}

  @Get('project/:projectId')
  @TokenRoute()
  @ApiOperation({ summary: 'Get reports for a project' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of reports',
    type: [BrandReportResponseDto] 
  })
  async getProjectReports(
    @Req() request: any,
    @Param('projectId') projectId: string,
    @Query('limit') limit?: number
  ): Promise<BrandReportResponseDto[]> {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    return this.brandReportService.getProjectReports(projectId, limit);
  }

  @Get(':reportId')
  @TokenRoute()
  @ApiOperation({ summary: 'Get a specific report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report details',
    type: BrandReportResponseDto 
  })
  async getReport(
    @Req() request: any,
    @Param('reportId') reportId: string
  ): Promise<BrandReportResponseDto> {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    return this.brandReportService.getReport(reportId);
  }

  @Get(':reportId/explorer')
  @TokenRoute()
  @ApiOperation({ summary: 'Get explorer data for a report' })
  async getExplorerData(
    @Req() request: any,
    @Param('reportId') reportId: string
  ) {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    return this.brandReportService.getExplorerData(reportId);
  }

  @Get(':reportId/visibility')
  @TokenRoute()
  @ApiOperation({ summary: 'Get visibility data for a report' })
  async getVisibilityData(
    @Req() request: any,
    @Param('reportId') reportId: string
  ) {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    return this.brandReportService.getVisibilityData(reportId);
  }

  @Get(':reportId/sentiment')
  @TokenRoute()
  @ApiOperation({ summary: 'Get sentiment data for a report' })
  async getSentimentData(
    @Req() request: any,
    @Param('reportId') reportId: string
  ) {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    return this.brandReportService.getSentimentData(reportId);
  }

  @Get(':reportId/alignment')
  @TokenRoute()
  @ApiOperation({ summary: 'Get alignment data for a report' })
  async getAlignmentData(
    @Req() request: any,
    @Param('reportId') reportId: string
  ) {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    return this.brandReportService.getAlignmentData(reportId);
  }

  @Get(':reportId/competition')
  @TokenRoute()
  @ApiOperation({ summary: 'Get competition data for a report' })
  async getCompetitionData(
    @Req() request: any,
    @Param('reportId') reportId: string
  ) {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    return this.brandReportService.getCompetitionData(reportId);
  }
}