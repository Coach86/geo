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
  Req,
  Logger,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReportService } from '../services/report.service';
import { ReportContentResponseDto } from '../dto/report-content-response.dto';
import { ReportConverterService } from '../services/report-converter.service';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { ProjectService } from '../../project/services/project.service';
import { TokenService } from '../../auth/services/token.service';
import { BatchResultRepository } from '../../batch/repositories/batch-result.repository';
import { UserService } from '../../user/services/user.service';

@ApiTags('public-reports')
@Controller('reports')
@UseInterceptors(ClassSerializerInterceptor)
export class PublicReportController {
  private readonly logger = new Logger(PublicReportController.name);

  constructor(
    private readonly reportService: ReportService,
    @Inject(ProjectService) private readonly projectService: ProjectService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    private readonly reportConverterService: ReportConverterService,
    private readonly batchResultRepository: BatchResultRepository,
    @Inject(UserService) private readonly userService: UserService,
  ) {}

  @Get('content/:reportId')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Get report content using a token' })
  @ApiParam({ name: 'reportId', description: 'The ID of the report' })
  @ApiQuery({ name: 'token', description: 'The access token to validate' })
  @ApiResponse({
    status: 200,
    description: 'Report content retrieved successfully',
    type: ReportContentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  async getReportContent(
    @Param('reportId') reportId: string,
    @Req() request: any,
  ): Promise<ReportContentResponseDto> {
    try {
      this.logger.log(`Token-based access attempt for report ${reportId}`);
      this.logger.log(
        `Request details: userId=${request.userId}, token=${request.token ? request.token.substring(0, 8) + '...' : 'none'}`,
      );

      // The userId is added to the request by the TokenAuthGuard
      if (!request.userId) {
        this.logger.warn(`No userId found in request for report ${reportId}`);

        // If we have a token but no userId, try to validate it directly
        if (request.token) {
          this.logger.log(
            `Attempting to validate token directly: ${request.token.substring(0, 8)}...`,
          );
          const validation = await this.tokenService.validateAccessToken(request.token);

          if (validation.valid && validation.userId) {
            this.logger.log(`Direct token validation successful, userId: ${validation.userId}`);
            request.userId = validation.userId;
          } else {
            this.logger.warn(`Direct token validation failed`);
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }

      // First, get the report to find out which project it belongs to
      const report: any = await this.reportService.getReportById(reportId);
      const projectId = report.projectId;

      this.logger.log(
        `Report ${reportId} belongs to project ${projectId}, verifying user ownership`,
      );

      // Get user to find their organization
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Get all projects for the user's organization
      const userProjects = await this.projectService.findByOrganizationId(user.organizationId);
      const userProjectIds = userProjects.map((project) => project.projectId);

      // Check if the user owns the project that the report belongs to
      if (!userProjectIds.includes(projectId)) {
        this.logger.warn(
          `User ${request.userId} does not own project ${projectId} for report ${reportId}`,
        );
        this.logger.warn(`User's projects: ${userProjectIds.join(', ')}`);
        throw new UnauthorizedException('You do not have access to this report');
      }

      this.logger.log(`Access granted for user ${request.userId} to report ${reportId}`);

      // Convert the entity to a response DTO
      return this.reportConverterService.convertEntityToResponseDto(report);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve report: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to retrieve report: ${error.message}`);
    }
  }

  @Get('project/:projectId')
  @TokenRoute()
  @ApiOperation({ summary: 'Get all reports for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 200,
    description: 'Reports retrieved successfully',
    type: [ReportContentResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectReports(
    @Req() request: any,
    @Param('projectId') projectId: string,
  ): Promise<ReportContentResponseDto[]> {
    try {
      this.logger.log(`Fetching reports for project ${projectId}`);

      // Validate user authentication
      if (!request.userId) {
        if (request.token) {
          const validation = await this.tokenService.validateAccessToken(request.token);
          if (validation.valid && validation.userId) {
            request.userId = validation.userId;
          } else {
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }

      // Get user to find their organization
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Verify user owns this project through their organization
      const userProjects = await this.projectService.findByOrganizationId(user.organizationId);
      const userProjectIds = userProjects.map((project) => project.projectId);

      if (!userProjectIds.includes(projectId)) {
        this.logger.warn(`User ${request.userId} does not own project ${projectId}`);
        throw new UnauthorizedException('You do not have access to reports for this project');
      }

      // Get all reports for the project
      const reportsResult = await this.reportService.getAllProjectReports(projectId);

      this.logger.log(`Found ${reportsResult.reports.length} reports for project ${projectId}`);

      // For each report summary, get the full report details
      const fullReports = await Promise.all(
        reportsResult.reports.map(async (reportSummary: any) => {
          const fullReport = await this.reportService.getReportById(reportSummary.id);
          // The fullReport is already a WeeklyBrandReportEntity, convert it to response DTO
          return this.reportConverterService.convertEntityToResponseDto(fullReport as any);
        }),
      );

      return fullReports;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to fetch project reports: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch project reports: ${error.message}`);
    }
  }

  @Get('citations/:reportId')
  @TokenRoute()
  @ApiOperation({ summary: 'Get citations data for a report' })
  @ApiParam({ name: 'reportId', description: 'The ID of the report' })
  @ApiResponse({
    status: 200,
    description: 'Citations data retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReportCitations(@Req() request: any, @Param('reportId') reportId: string) {
    try {
      this.logger.log(`Fetching citations for report ${reportId}`);

      // Validate user authentication
      if (!request.userId) {
        if (request.token) {
          const validation = await this.tokenService.validateAccessToken(request.token);
          if (validation.valid && validation.userId) {
            request.userId = validation.userId;
          } else {
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }

      // Get the report to verify ownership
      const report: any = await this.reportService.getReportById(reportId);
      const projectId = report.projectId;

      // Get user to find their organization
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Verify user owns this project through their organization
      const userProjects = await this.projectService.findByOrganizationId(user.organizationId);
      const userProjectIds = userProjects.map((project) => project.projectId);

      if (!userProjectIds.includes(projectId)) {
        this.logger.warn(`User ${request.userId} does not own project ${projectId}`);
        throw new UnauthorizedException('You do not have access to citations for this report');
      }

      // Check if report has the new citationsData field
      if (report.citationsData) {
        this.logger.log(`Using stored citations data for report ${reportId}`);
        this.logger.log(`CitationsData summary: ${JSON.stringify(report.citationsData.summary)}`);
        this.logger.log(`Number of topKeywords: ${report.citationsData.topKeywords?.length || 0}`);
        this.logger.log(`First 3 keywords: ${JSON.stringify(report.citationsData.topKeywords?.slice(0, 3) || [])}`);
        
        // Transform stored data to match the existing API response format
        const allCitations = report.citationsData.citationsByModel?.flatMap((modelData: any) => {
          this.logger.debug(`Model ${modelData.modelId} has ${modelData.webSearchQueries?.length || 0} queries`);
          
          // If model has citations, distribute webSearchQueries across them
          if (modelData.citations && modelData.citations.length > 0) {
            return modelData.citations.map((citation: any) => ({
              website: citation.title || citation.source,
              webSearchQueries: modelData.webSearchQueries || [],
              link: citation.url,
              model: modelData.modelId,
              promptIndex: modelData.promptIndex,
              promptType: modelData.promptType
            }));
          } else {
            // If no citations but has web search queries, create a placeholder entry
            if (modelData.webSearchQueries && modelData.webSearchQueries.length > 0) {
              return [{
                website: 'No citation',
                webSearchQueries: modelData.webSearchQueries,
                link: '',
                model: modelData.modelId,
                promptIndex: modelData.promptIndex,
                promptType: modelData.promptType
              }];
            }
            return [];
          }
        }) || [];

        return {
          webAccess: {
            totalResponses: report.citationsData.summary?.totalPrompts || 0,
            responsesWithWebAccess: report.citationsData.summary?.promptsWithWebAccess || 0,
            percentage: report.citationsData.summary?.webAccessPercentage || 0,
          },
          topSources: report.citationsData.topSources || [],
          topKeywords: report.citationsData.topKeywords || [],
          citations: allCitations,
        };
      }

      // Fallback to legacy method for older reports
      this.logger.log(`Falling back to batch results for report ${reportId}`);
      const batchExecutionId = (report as unknown as Record<string, string>).batchExecutionId;

      if (!batchExecutionId) {
        throw new NotFoundException('No batch execution found for this report');
      }

      // Get the spontaneous batch results
      const spontaneousBatchResult = await this.batchResultRepository.findByExecutionIdAndTypeLean(
        batchExecutionId,
        'spontaneous',
      );

      if (!spontaneousBatchResult) {
        throw new NotFoundException('No spontaneous batch results found for this report');
      }

      // Extract citations data from batch results
      const results = spontaneousBatchResult.result?.results || [];
      this.logger.log(`Found ${results.length} results for report ${reportId}`);
      let totalResponses = 0;
      let responsesWithWebAccess = 0;
      const allCitations: any[] = [];
      const sourceFrequency: Record<string, number> = {};

      // Process each result
      results.forEach((result: any, index: number) => {
        totalResponses++;

        // Check if web search was used
        if (result.usedWebSearch) {
          responsesWithWebAccess++;
        }

        // Extract citations
        if (result.citations && Array.isArray(result.citations)) {
          result.citations.forEach((citation: any) => {
              allCitations.push({
                website: citation.title || citation.url || 'Unknown',
                webSearchQueries: result.webSearchQueries || [],
                link: citation.url || '',
                model: result.llmModel || 'Unknown',
                promptIndex: index,
                promptType: 'spontaneous',
                fullCitation: citation,
              });

              // Count source frequency for top sources
              const domain = this.extractDomain(citation.url || '');
              if (domain) {
                sourceFrequency[domain] = (sourceFrequency[domain] || 0) + 1;
              }
          });
        }
      });

      // Calculate percentage
      const webAccessPercentage =
        totalResponses > 0 ? Math.round((responsesWithWebAccess / totalResponses) * 100) : 0;

      // Get top 5 most common sources
      const topSources = Object.entries(sourceFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([domain, count]) => ({ domain, count }));

      return {
        webAccess: {
          totalResponses,
          responsesWithWebAccess,
          percentage: webAccessPercentage,
        },
        topSources,
        topKeywords: [], // Empty for legacy reports
        citations: allCitations,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch citations: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch citations: ${error.message}`);
    }
  }

  @Get('spontaneous/:reportId')
  @TokenRoute()
  @ApiOperation({ summary: 'Get spontaneous data for a report' })
  @ApiParam({ name: 'reportId', description: 'The ID of the report' })
  @ApiResponse({
    status: 200,
    description: 'Spontaneous data retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReportSpontaneous(@Req() request: any, @Param('reportId') reportId: string) {
    try {
      this.logger.log(`Fetching spontaneous data for report ${reportId}`);

      // Validate user authentication
      if (!request.userId) {
        if (request.token) {
          const validation = await this.tokenService.validateAccessToken(request.token);
          if (validation.valid && validation.userId) {
            request.userId = validation.userId;
          } else {
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }

      // Get the report to find the batch execution ID and verify ownership
      const report = await this.reportService.getReportById(reportId);
      const projectId = report.projectId;
      const batchExecutionId = (report as unknown as Record<string, string>).batchExecutionId;

      if (!batchExecutionId) {
        throw new NotFoundException('No batch execution found for this report');
      }

      // Get user to find their organization
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Verify user owns this project through their organization
      const userProjects = await this.projectService.findByOrganizationId(user.organizationId);
      const userProjectIds = userProjects.map((project) => project.projectId);

      if (!userProjectIds.includes(projectId)) {
        this.logger.warn(`User ${request.userId} does not own project ${projectId}`);
        throw new UnauthorizedException(
          'You do not have access to spontaneous data for this report',
        );
      }

      // Get the spontaneous batch results
      const spontaneousBatchResult = await this.batchResultRepository.findByExecutionIdAndTypeLean(
        batchExecutionId,
        'spontaneous',
      );

      if (!spontaneousBatchResult) {
        throw new NotFoundException('No spontaneous batch results found for this report');
      }

      // Return the spontaneous results directly
      return spontaneousBatchResult.result;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch spontaneous data: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch spontaneous data: ${error.message}`);
    }
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }
}
