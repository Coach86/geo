import { 
  Controller, 
  Post, 
  Get, 
  Param, 
  Body,
  Req,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';
import { VisibilityScannerService } from '../services/visibility-scanner.service';
import { ProjectService } from '../../project/services/project.service';
import { ExecuteScanDto } from '../dto/scan-config.dto';

@ApiTags('AI Visibility - Scanner')
@Controller('ai-visibility/scan')
export class ScannerController {
  private readonly logger = new Logger(ScannerController.name);

  constructor(
    private readonly visibilityScannerService: VisibilityScannerService,
    private readonly projectService: ProjectService,
    private readonly tokenService: TokenService,
  ) {}

  @Post(':projectId/execute')
  @TokenRoute()
  @ApiOperation({ summary: 'Execute AI visibility scan' })
  @ApiResponse({ status: 200, description: 'Scan started successfully' })
  async executeScan(
    @Param('projectId') projectId: string,
    @Body() dto: ExecuteScanDto,
    @Req() request: any
  ) {
    this.logger.log(`🚀 SCAN REQUEST RECEIVED for project ${projectId}`);
    this.logger.log(`Scan config: ${JSON.stringify(dto.config)}`);
    
    // Validate user authentication
    if (!request.userId) {
      this.logger.error(`❌ User not authenticated`);
      throw new UnauthorizedException('User not authenticated');
    }
    this.logger.log(`✅ User authenticated: ${request.userId}`);

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      this.logger.error(`❌ Project not found: ${projectId}`);
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }
    this.logger.log(`✅ Project found: ${project.brandName}`);

    this.logger.log(`🔍 Calling visibilityScannerService.executeScan...`);
    const scanId = await this.visibilityScannerService.executeScan(
      projectId,
      dto.config
    );
    this.logger.log(`✅ Scan started with ID: ${scanId}`);

    return {
      message: 'Scan started successfully',
      scanId,
      projectId,
    };
  }

  @Get(':projectId/results/:scanId')
  @TokenRoute()
  @ApiOperation({ summary: 'Get scan results' })
  @ApiResponse({ status: 200, description: 'Scan results retrieved' })
  async getScanResults(
    @Param('projectId') projectId: string,
    @Param('scanId') scanId: string,
    @Req() request: any
  ) {
    // Validate user authentication
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    const scanResult = await this.visibilityScannerService.getScanResult(scanId);
    if (!scanResult) {
      throw new HttpException('Scan not found', HttpStatus.NOT_FOUND);
    }

    // Verify scan belongs to project
    if (scanResult.projectId.toString() !== projectId) {
      throw new HttpException('Scan not found', HttpStatus.NOT_FOUND);
    }

    // Calculate overlap analysis data for the frontend
    const overlapAnalysis = this.calculateOverlapAnalysis(scanResult);

    return {
      scanId: scanResult.scanId,
      status: scanResult.status,
      startedAt: scanResult.startedAt,
      completedAt: scanResult.completedAt,
      configuration: scanResult.configuration,
      coverageMetrics: scanResult.coverageMetrics,
      visibilityPatterns: {
        ...scanResult.visibilityPatterns,
        overlapAnalysis
      },
      overallStats: scanResult.overallStats,
      queryResults: scanResult.queryResults?.slice(0, 10), // Return sample
      totalQueries: scanResult.queries?.length || 0,
    };
  }

  @Get(':projectId/results')
  @TokenRoute()
  @ApiOperation({ summary: 'List all scans for a project' })
  @ApiResponse({ status: 200, description: 'Scan list retrieved' })
  async listScans(
    @Param('projectId') projectId: string,
    @Req() request: any
  ) {
    // Validate user authentication
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    const scans = await this.visibilityScannerService.getProjectScans(
      projectId
    );

    return {
      total: scans.length,
      scans: scans.map(scan => ({
        scanId: scan.scanId,
        status: scan.status,
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
        configuration: scan.configuration,
        coverageMetrics: scan.coverageMetrics,
        totalQueries: scan.queries?.length || 0,
      })),
    };
  }

  @Get(':projectId/recommendations/:scanId')
  @TokenRoute()
  @ApiOperation({ summary: 'Get AI optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved' })
  async getRecommendations(
    @Param('projectId') projectId: string,
    @Param('scanId') scanId: string,
    @Req() request: any
  ) {
    // Validate user authentication
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    const scanResult = await this.visibilityScannerService.getScanResult(scanId);
    if (!scanResult) {
      throw new HttpException('Scan not found', HttpStatus.NOT_FOUND);
    }

    // Verify scan belongs to project
    if (scanResult.projectId.toString() !== projectId) {
      throw new HttpException('Scan not found', HttpStatus.NOT_FOUND);
    }

    return {
      scanId: scanResult.scanId,
      recommendations: scanResult.recommendations || [],
      coverageMetrics: scanResult.coverageMetrics,
    };
  }

  private calculateOverlapAnalysis(scanResult: any): any {
    if (!scanResult.queryResults || scanResult.queryResults.length === 0) {
      return {
        overlapDistribution: [],
        overlapByQueryType: [],
        topOverlappingQueries: [],
      };
    }

    // Calculate overlap distribution (for pie chart)
    const overlapRanges = {
      '0-25%': 0,
      '26-50%': 0,
      '51-75%': 0,
      '76-100%': 0,
    };

    scanResult.queryResults.forEach((result: any) => {
      const overlap = result.overlap * 100;
      if (overlap <= 25) overlapRanges['0-25%']++;
      else if (overlap <= 50) overlapRanges['26-50%']++;
      else if (overlap <= 75) overlapRanges['51-75%']++;
      else overlapRanges['76-100%']++;
    });

    const overlapDistribution = Object.entries(overlapRanges).map(([range, count]) => ({
      name: range,
      value: count,
    }));

    // Calculate overlap by query type (for radar chart)
    const queryTypeOverlap: { [key: string]: { total: number; count: number } } = {};
    
    scanResult.queryResults.forEach((result: any) => {
      if (!queryTypeOverlap[result.intent]) {
        queryTypeOverlap[result.intent] = { total: 0, count: 0 };
      }
      queryTypeOverlap[result.intent].total += result.overlap;
      queryTypeOverlap[result.intent].count++;
    });

    const overlapByQueryType = Object.entries(queryTypeOverlap).map(([type, data]) => ({
      type,
      overlap: data.count > 0 ? data.total / data.count : 0,
    }));

    // Get top overlapping queries
    const topOverlappingQueries = scanResult.queryResults
      .filter((r: any) => r.overlap > 0)
      .sort((a: any, b: any) => b.overlap - a.overlap)
      .slice(0, 10)
      .map((r: any) => ({
        query: r.query,
        overlap: r.overlap,
        bm25Found: r.bm25Results.found,
        vectorFound: r.vectorResults.found,
      }));

    return {
      overlapDistribution,
      overlapByQueryType,
      topOverlappingQueries,
    };
  }
}