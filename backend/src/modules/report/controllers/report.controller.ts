import { 
  Controller, 
  Get, 
  Post,
  Param, 
  Body,
  Query,
  UseInterceptors, 
  ClassSerializerInterceptor, 
  NotFoundException, 
  UnauthorizedException,
  BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ReportService } from '../services/report.service';
import { WeeklyReportResponseDto } from '../dto/weekly-report-response.dto';
import { 
  ValidateTokenResponseDto, 
  ResendTokenRequestDto, 
  ResendTokenResponseDto,
  TokenDebugResponseDto 
} from '../dto/report-access-token.dto';
import { ReportEmailDto, CompanyReportsResponseDto } from '../dto/report-email.dto';
import { ReportContentResponseDto } from '../dto/report-content-response.dto';

@ApiTags('reports')
@Controller('reports')
@UseInterceptors(ClassSerializerInterceptor)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get(':companyId/latest')
  @ApiOperation({ summary: 'Get the latest weekly report for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({ 
    status: 200, 
    description: 'The latest weekly report has been successfully retrieved.',
    type: WeeklyReportResponseDto
  })
  @ApiResponse({ status: 404, description: 'No reports found for the company.' })
  async getLatestReport(@Param('companyId') companyId: string): Promise<WeeklyReportResponseDto> {
    try {
      const report = await this.reportService.getLatestReport(companyId);
      
      // Map to DTO
      const response = new WeeklyReportResponseDto();
      response.companyId = report.companyId;
      response.weekStart = report.weekStart;
      response.spontaneous = report.spontaneous;
      response.sentimentAccuracy = report.sentimentAccuracy;
      response.comparison = report.comparison;
      response.llmVersions = report.llmVersions;
      response.generatedAt = report.generatedAt;
      
      return response;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve report: ${error.message}`);
    }
  }
  
  @Get(':companyId/all')
  @ApiOperation({ summary: 'Get all reports for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({ 
    status: 200, 
    description: 'All reports for the company have been successfully retrieved.',
    type: CompanyReportsResponseDto
  })
  async getAllCompanyReports(@Param('companyId') companyId: string) {
    return this.reportService.getAllCompanyReports(companyId);
  }
  
  @Post('send-email')
  @ApiOperation({ summary: 'Send a report access email to a specific address' })
  @ApiBody({ type: ReportEmailDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Report access email sent successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Email sent successfully' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  async sendReportEmail(@Body() emailDto: ReportEmailDto) {
    try {
      // Validate DTO fields
      if (!emailDto.reportId || !emailDto.companyId || !emailDto.email) {
        throw new BadRequestException('Report ID, company ID, and email are required');
      }
      
      // Send the email
      const result = await this.reportService.sendReportEmailToAddress(
        emailDto.reportId,
        emailDto.companyId,
        emailDto.email,
        emailDto.subject
      );
      
      return {
        success: result,
        message: result ? 'Email sent successfully' : 'Failed to send email'
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  @Get('access/validate')
  @ApiOperation({ summary: 'Validate a report access token' })
  @ApiQuery({ name: 'token', description: 'The access token to validate' })
  @ApiResponse({ 
    status: 200, 
    description: 'The token validation result',
    type: ValidateTokenResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  async validateToken(@Query('token') token: string): Promise<ValidateTokenResponseDto> {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    
    return await this.reportService.validateAccessToken(token);
  }

  @Post('access/resend')
  @ApiOperation({ summary: 'Resend a report access token' })
  @ApiBody({ type: ResendTokenRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'The token has been resent successfully',
    type: ResendTokenResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  async resendToken(@Body() request: ResendTokenRequestDto): Promise<ResendTokenResponseDto> {
    try {
      if (!request.reportId || !request.companyId) {
        throw new BadRequestException('Both reportId and companyId are required');
      }
      
      // Check that the report exists
      await this.reportService.getReportById(request.reportId);
      
      // Generate a new token and send email
      const token = await this.reportService.generateAccessToken(request.reportId, request.companyId);
      await this.reportService.sendReportAccessEmail(request.reportId, request.companyId, token);
      
      return {
        success: true,
        message: 'Access link sent successfully'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to resend access token: ${error.message}`);
    }
  }

  @Get('access/debug')
  @ApiOperation({ summary: 'Generate a debug token for development (non-production only)' })
  @ApiQuery({ name: 'reportId', description: 'The report ID to generate a token for' })
  @ApiQuery({ name: 'companyId', description: 'The company ID for the report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Debug token generated successfully',
    type: TokenDebugResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid request or not in development mode.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  async debugToken(
    @Query('reportId') reportId: string,
    @Query('companyId') companyId: string
  ): Promise<TokenDebugResponseDto> {
    // Only allow in development mode
    const environment = process.env.NODE_ENV || 'development';
    if (environment !== 'development') {
      throw new BadRequestException('Debug endpoint only available in development mode');
    }
    
    if (!reportId || !companyId) {
      throw new BadRequestException('Both reportId and companyId are required');
    }
    
    try {
      // Verify the report exists
      await this.reportService.getReportById(reportId);
      
      // Generate token
      const token = await this.reportService.generateAccessToken(reportId, companyId);
      
      // Construct the access URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const accessUrl = `${baseUrl}/report-access?token=${token}`;
      
      return {
        token,
        accessUrl
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to generate debug token: ${error.message}`);
    }
  }

  @Get('content/:reportId')
  @ApiOperation({ summary: 'Get report content using a token' })
  @ApiParam({ name: 'reportId', description: 'The ID of the report' })
  @ApiQuery({ name: 'token', description: 'The access token to validate' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report content retrieved successfully',
    type: ReportContentResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid request or token.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  async getReportContent(
    @Param('reportId') reportId: string,
    @Query('token') token: string
  ): Promise<ReportContentResponseDto> {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    
    // Validate the token
    const validation = await this.reportService.validateAccessToken(token);
    
    if (!validation.valid) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    
    // Make sure the token is for this report
    if (validation.reportId !== reportId) {
      throw new UnauthorizedException('Token is not valid for this report');
    }
    
    // Get the report data
    const report = await this.reportService.getReportById(reportId);
    
    // Get the identity card for this company to get brand information
    const identityCard = await this.reportService.getCompanyIdentityCard(report.companyId);
    
    // Get the config for available LLM models
    const config = await this.reportService.getConfig();
    const modelsList = config.llmModels.map((model: { provider: string; model: string }) => 
      `${model.provider} ${model.model}`
    ).join(', ');
    
    // Transform the report data into the proper structure for the frontend
    // Match the structure expected by the BrandIntelligenceReport component
    const formattedData = {
      id: report.id,
      companyId: report.companyId,
      weekStart: report.weekStart,
      generatedAt: report.generatedAt,
      
      // Brand and metadata
      brand: identityCard?.brandName || report.companyId,
      metadata: {
        url: identityCard?.website || `${report.companyId}.com`,
        market: identityCard?.market || 'US Market / English',
        flag: '🇺🇸', // Default flag
        competitors: identityCard?.competitors?.join(', ') || 'Key competitors',
        date: report.weekStart instanceof Date 
          ? report.weekStart.toISOString().split('T')[0] 
          : new Date(report.weekStart).toISOString().split('T')[0],
        models: modelsList,
      },
      
      // KPI section
      kpi: {
        pulse: {
          value: `${report.spontaneous?.summary?.mentionRate || 0}%`,
          description: 'Global Visibility Score across all tested models',
        },
        tone: {
          value: report.sentimentAccuracy?.summary?.overallSentiment === 'positive' ? '+0.35' : 
                 report.sentimentAccuracy?.summary?.overallSentiment === 'negative' ? '-0.35' : '0.00',
          status: report.sentimentAccuracy?.summary?.overallSentiment === 'positive' ? 'green' : 
                  report.sentimentAccuracy?.summary?.overallSentiment === 'negative' ? 'red' : 'yellow',
          description: 'Overall sentiment score across all models',
        },
        accord: {
          value: `${Math.round((report.sentimentAccuracy?.summary?.averageAccuracy || 0) * 10)}/10`,
          status: (report.sentimentAccuracy?.summary?.averageAccuracy || 0) > 0.6 ? 'green' : 'yellow',
          description: 'Brand compliance with provided attributes',
        },
        arena: {
          competitors: report.comparison?.summary?.keyDifferentiators || 
                      identityCard?.competitors?.slice(0, 3) || 
                      [],
          description: 'Top competitors mentioned by AI models',
        },
      },
      
      // Pulse section
      pulse: {
        promptsTested: report.spontaneous?.results?.length || 0,
        modelVisibility: this.reportService.formatPulseModelVisibility(report.spontaneous, report.llmVersions),
      },
      
      // Tone section
      tone: this.reportService.formatToneData(report.sentimentAccuracy),
      
      // Accord section
      accord: {
        attributes: [
          {
            name: 'Accuracy',
            rate: `${Math.round((report.sentimentAccuracy?.summary?.averageAccuracy || 0) * 100)}%`,
            alignment: (report.sentimentAccuracy?.summary?.averageAccuracy || 0) > 0.7 ? '✅' : '⚠️',
          },
        ],
        score: {
          value: `${Math.round((report.sentimentAccuracy?.summary?.averageAccuracy || 0) * 10)}/10`,
          status: (report.sentimentAccuracy?.summary?.averageAccuracy || 0) > 0.6 ? 'green' : 'yellow',
        },
      },
      
      // Arena section
      arena: this.reportService.formatArenaData(report.comparison, identityCard?.competitors),
      
      // Raw data for debugging (not exposed to frontend)
      rawData: {
        spontaneous: report.spontaneous,
        sentiment: report.sentimentAccuracy,
        comparison: report.comparison,
        llmVersions: report.llmVersions
      }
    };
    
    // Return the formatted data
    return formattedData;
  }
}