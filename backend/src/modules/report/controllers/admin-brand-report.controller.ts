import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BrandReportService } from '../services/brand-report.service';
import { BrandReportResponseDto } from '../dto/brand-report-response.dto';

@ApiTags('Admin - Reports')
@Controller('admin/brand-reports')
export class AdminBrandReportController {
  constructor(private readonly brandReportService: BrandReportService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get reports for a project (Admin)' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of reports',
    type: [BrandReportResponseDto] 
  })
  async getProjectReports(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: number
  ): Promise<BrandReportResponseDto[]> {
    return this.brandReportService.getProjectReports(projectId, limit);
  }

  @Get(':reportId')
  @ApiOperation({ summary: 'Get a specific report (Admin)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report details',
    type: BrandReportResponseDto 
  })
  async getReport(
    @Param('reportId') reportId: string
  ): Promise<BrandReportResponseDto> {
    return this.brandReportService.getReport(reportId);
  }

  @Get(':reportId/explorer')
  @ApiOperation({ summary: 'Get explorer data for a report (Admin)' })
  async getExplorerData(@Param('reportId') reportId: string) {
    return this.brandReportService.getExplorerData(reportId);
  }

  @Get(':reportId/visibility')
  @ApiOperation({ summary: 'Get visibility data for a report (Admin)' })
  async getVisibilityData(@Param('reportId') reportId: string) {
    return this.brandReportService.getVisibilityData(reportId);
  }

  @Get(':reportId/sentiment')
  @ApiOperation({ summary: 'Get sentiment data for a report (Admin)' })
  async getSentimentData(@Param('reportId') reportId: string) {
    return this.brandReportService.getSentimentData(reportId);
  }

  @Get(':reportId/alignment')
  @ApiOperation({ summary: 'Get alignment data for a report (Admin)' })
  async getAlignmentData(@Param('reportId') reportId: string) {
    return this.brandReportService.getAlignmentData(reportId);
  }

  @Get(':reportId/competition')
  @ApiOperation({ summary: 'Get competition data for a report (Admin)' })
  async getCompetitionData(@Param('reportId') reportId: string) {
    return this.brandReportService.getCompetitionData(reportId);
  }
}