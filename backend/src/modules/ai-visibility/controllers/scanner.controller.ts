import { 
  Controller, 
  Post, 
  Get, 
  Param, 
  Body,
  Req,
  HttpException,
  HttpStatus,
  UnauthorizedException
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
    // Validate user authentication
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    const scanId = await this.visibilityScannerService.executeScan(
      projectId,
      dto.config
    );

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

    return {
      scanId: scanResult.scanId,
      status: scanResult.status,
      startedAt: scanResult.startedAt,
      completedAt: scanResult.completedAt,
      configuration: scanResult.configuration,
      coverageMetrics: scanResult.coverageMetrics,
      visibilityPatterns: scanResult.visibilityPatterns,
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
}