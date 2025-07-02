import { Controller, Get, Param, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BrandReportService } from '../services/brand-report.service';
import { BrandReportResponseDto } from '../dto/brand-report-response.dto';
import { AggregatedReportQueryDto } from '../dto/aggregated-report-query.dto';
import { AggregatedVisibilityResponseDto } from '../dto/aggregated-visibility-response.dto';
import { AggregatedAlignmentResponseDto } from '../dto/aggregated-alignment-response.dto';
import { AggregatedSentimentResponseDto } from '../dto/aggregated-sentiment-response.dto';
import { AggregatedExplorerResponseDto } from '../dto/aggregated-explorer-response.dto';
import { AggregatedCompetitionResponseDto } from '../dto/aggregated-competition-response.dto';
import { ExplorerData } from '../dto/report-explorer-response.dto';
import { VisibilityData } from '../dto/report-visibility-response.dto';
import { SentimentData } from '../dto/report-sentiment-response.dto';
import { AlignmentData } from '../dto/report-alignment-response.dto';
import { CompetitionData, ReportCompetitionResponseDto } from '../dto/report-competition-response.dto';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';

@ApiTags('User - Reports')
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
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brandReportService.getProjectReports(projectId, limit, userId);
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
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brandReportService.getReport(reportId, userId);
  }

  @Get(':reportId/explorer')
  @TokenRoute()
  @ApiOperation({ summary: 'Get explorer data for a report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Explorer data for the report',
    type: ExplorerData 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getExplorerData(
    @Req() request: any,
    @Param('reportId') reportId: string
  ) {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brandReportService.getExplorerData(reportId, userId);
  }

  @Get(':reportId/visibility')
  @TokenRoute()
  @ApiOperation({ summary: 'Get visibility data for a report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Visibility data for the report',
    type: VisibilityData 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getVisibilityData(
    @Req() request: any,
    @Param('reportId') reportId: string
  ) {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brandReportService.getVisibilityData(reportId, userId);
  }

  @Get(':reportId/sentiment')
  @TokenRoute()
  @ApiOperation({ summary: 'Get sentiment data for a report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sentiment data for the report',
    type: SentimentData 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getSentimentData(
    @Req() request: any,
    @Param('reportId') reportId: string
  ) {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brandReportService.getSentimentData(reportId, userId);
  }

  @Get(':reportId/alignment')
  @TokenRoute()
  @ApiOperation({ summary: 'Get alignment data for a report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Alignment data for the report',
    type: AlignmentData 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getAlignmentData(
    @Req() request: any,
    @Param('reportId') reportId: string
  ) {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brandReportService.getAlignmentData(reportId, userId);
  }

  @Get(':reportId/competition')
  @TokenRoute()
  @ApiOperation({ summary: 'Get competition data for a report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Competition data for the report',
    type: CompetitionData 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getCompetitionData(
    @Req() request: any,
    @Param('reportId') reportId: string
  ): Promise<ReportCompetitionResponseDto> {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brandReportService.getCompetitionData(reportId, userId);
  }

  @Get('project/:projectId/visibility/aggregated')
  @TokenRoute()
  @ApiOperation({ summary: 'Get aggregated visibility data for a project' })
  @ApiResponse({ 
    status: 200, 
    description: 'Aggregated visibility data',
    type: AggregatedVisibilityResponseDto 
  })
  async getAggregatedVisibility(
    @Req() request: any,
    @Param('projectId') projectId: string,
    @Query() query: AggregatedReportQueryDto
  ): Promise<AggregatedVisibilityResponseDto> {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brandReportService.getAggregatedVisibility(projectId, query, userId);
  }

  @Get('project/:projectId/alignment/aggregated')
  @TokenRoute()
  @ApiOperation({ summary: 'Get aggregated alignment data for a project' })
  @ApiResponse({ 
    status: 200, 
    description: 'Aggregated alignment data',
    type: AggregatedAlignmentResponseDto 
  })
  async getAggregatedAlignment(
    @Req() request: any,
    @Param('projectId') projectId: string,
    @Query() query: AggregatedReportQueryDto
  ): Promise<AggregatedAlignmentResponseDto> {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brandReportService.getAggregatedAlignment(projectId, query, userId);
  }

  @Get('project/:projectId/sentiment/aggregated')
  @TokenRoute()
  @ApiOperation({ summary: 'Get aggregated sentiment data for a project' })
  @ApiResponse({ 
    status: 200, 
    description: 'Aggregated sentiment data',
    type: AggregatedSentimentResponseDto 
  })
  async getAggregatedSentiment(
    @Req() request: any,
    @Param('projectId') projectId: string,
    @Query() query: AggregatedReportQueryDto
  ): Promise<AggregatedSentimentResponseDto> {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brandReportService.getAggregatedSentiment(projectId, query, userId);
  }

  @Get('project/:projectId/explorer/aggregated')
  @TokenRoute()
  @ApiOperation({ summary: 'Get aggregated explorer data for a project' })
  @ApiResponse({ 
    status: 200, 
    description: 'Aggregated explorer data',
    type: AggregatedExplorerResponseDto 
  })
  async getAggregatedExplorer(
    @Req() request: any,
    @Param('projectId') projectId: string,
    @Query() query: AggregatedReportQueryDto
  ): Promise<AggregatedExplorerResponseDto> {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brandReportService.getAggregatedExplorer(projectId, query, userId);
  }

  @Get('project/:projectId/competition/aggregated')
  @TokenRoute()
  @ApiOperation({ summary: 'Get aggregated competition data for a project' })
  @ApiResponse({ 
    status: 200, 
    description: 'Aggregated competition data',
    type: AggregatedCompetitionResponseDto 
  })
  async getAggregatedCompetition(
    @Req() request: any,
    @Param('projectId') projectId: string,
    @Query() query: AggregatedReportQueryDto
  ): Promise<AggregatedCompetitionResponseDto> {
    // Token validation is handled by TokenAuthGuard via @TokenRoute decorator
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brandReportService.getAggregatedCompetition(projectId, query, userId);
  }
}