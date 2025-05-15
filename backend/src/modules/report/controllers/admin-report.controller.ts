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
  BadRequestException,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ReportService } from '../services/report.service';
import { WeeklyReportResponseDto } from '../dto/weekly-report-response.dto';
import {
  ValidateTokenResponseDto,
  ResendTokenRequestDto,
  ResendTokenResponseDto,
  TokenDebugResponseDto,
} from '../dto/report-access-token.dto';
import { ReportEmailDto, CompanyReportsResponseDto } from '../dto/report-email.dto';
import { UserService } from '../../user/services/user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('admin-reports')
@Controller('admin/reports')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard) // Protect all admin endpoints with JWT auth
export class AdminReportController {
  constructor(
    private readonly reportService: ReportService,
    @Inject(UserService) private readonly userService: UserService,
  ) {}

  @Get(':companyId/latest')
  @ApiOperation({ summary: 'Get the latest weekly report for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({
    status: 200,
    description: 'The latest weekly report has been successfully retrieved.',
    type: WeeklyReportResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No reports found for the company.' })
  async getLatestReport(@Param('companyId') companyId: string): Promise<WeeklyReportResponseDto> {
    try {
      const report = await this.reportService.getLatestReport(companyId);

      // Map to DTO
      const response = new WeeklyReportResponseDto();
      response.companyId = report.companyId;
      response.weekStart = report.weekStart || new Date();

      // Map new fields if they exist, otherwise use legacy fields
      response.spontaneous = report.spontaneous || {
        results: [],
        summary: { mentionRate: 0, topMentions: [] },
      };
      response.sentimentAccuracy = report.sentimentAccuracy || {
        results: [],
        summary: { overallSentiment: 'neutral', averageAccuracy: 0 },
      };
      response.comparison = report.comparison || {
        results: [],
        summary: { winRate: 0, keyDifferentiators: [] },
      };
      response.llmVersions = report.llmVersions || {};
      response.generatedAt = report.generatedAt || new Date();

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
    type: CompanyReportsResponseDto,
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
        message: { type: 'string', example: 'Email sent successfully' },
      },
    },
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
        emailDto.subject,
      );

      return {
        success: result,
        message: result ? 'Email sent successfully' : 'Failed to send email',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }
}
