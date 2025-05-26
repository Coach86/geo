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
import { IdentityCardService } from '../../identity-card/services/identity-card.service';
import { TokenService } from '../../auth/services/token.service';

@ApiTags('public-reports')
@Controller('reports')
@UseInterceptors(ClassSerializerInterceptor)
export class PublicReportController {
  private readonly logger = new Logger(PublicReportController.name);

  constructor(
    private readonly reportService: ReportService,
    @Inject(IdentityCardService) private readonly identityCardService: IdentityCardService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    private readonly reportConverterService: ReportConverterService,
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
    @Req() request: any
  ): Promise<ReportContentResponseDto> {
    try {
      this.logger.log(`Token-based access attempt for report ${reportId}`);
      this.logger.log(`Request details: userId=${request.userId}, token=${request.token ? request.token.substring(0, 8) + '...' : 'none'}`);
      
      // The userId is added to the request by the TokenAuthGuard
      if (!request.userId) {
        this.logger.warn(`No userId found in request for report ${reportId}`);
        
        // If we have a token but no userId, try to validate it directly
        if (request.token) {
          this.logger.log(`Attempting to validate token directly: ${request.token.substring(0, 8)}...`);
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
      
      // First, get the report to find out which company it belongs to
      const report: any = await this.reportService.getReportById(reportId);
      const companyId = report.companyId;
      
      this.logger.log(`Report ${reportId} belongs to company ${companyId}, verifying user ownership`);
      
      // Get all companies that the user owns
      const userCompanies = await this.identityCardService.findAll(request.userId);
      const userCompanyIds = userCompanies.map(company => company.companyId);
      
      // Check if the user owns the company that the report belongs to
      if (!userCompanyIds.includes(companyId)) {
        this.logger.warn(`User ${request.userId} does not own company ${companyId} for report ${reportId}`);
        this.logger.warn(`User's companies: ${userCompanyIds.join(', ')}`);
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

  @Get('company/:companyId')
  @TokenRoute()
  @ApiOperation({ summary: 'Get all reports for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({
    status: 200,
    description: 'Reports retrieved successfully',
    type: [ReportContentResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompanyReports(
    @Req() request: any,
    @Param('companyId') companyId: string
  ): Promise<ReportContentResponseDto[]> {
    try {
      this.logger.log(`Fetching reports for company ${companyId}`);
      
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

      // Verify user owns this company
      const userCompanies = await this.identityCardService.findAll(request.userId);
      const userCompanyIds = userCompanies.map(company => company.companyId);
      
      if (!userCompanyIds.includes(companyId)) {
        this.logger.warn(`User ${request.userId} does not own company ${companyId}`);
        throw new UnauthorizedException('You do not have access to reports for this company');
      }

      // Get all reports for the company
      const reportsResult = await this.reportService.getAllCompanyReports(companyId);
      
      this.logger.log(`Found ${reportsResult.reports.length} reports for company ${companyId}`);
      
      // For each report summary, get the full report details
      const fullReports = await Promise.all(
        reportsResult.reports.map(async (reportSummary: any) => {
          const fullReport = await this.reportService.getReportById(reportSummary.id);
          // The fullReport is already a WeeklyBrandReportEntity, convert it to response DTO
          return this.reportConverterService.convertEntityToResponseDto(fullReport as any);
        })
      );
      
      return fullReports;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to fetch company reports: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch company reports: ${error.message}`);
    }
  }
}
