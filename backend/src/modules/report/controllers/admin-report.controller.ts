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
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ReportService } from '../services/report.service';
import { WeeklyReportResponseDto } from '../dto/weekly-report-response.dto';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../auth/services/token.service';
import { UserService } from '../../user/services/user.service';
import { IdentityCardService } from '../../identity-card/services/identity-card.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ValidateTokenResponseDto,
  ResendTokenRequestDto,
  ResendTokenResponseDto,
  ReportTokenDebugResponseDto,
} from '../dto/report-access-token.dto';
import { ReportEmailDto, CompanyReportsResponseDto } from '../dto/report-email.dto';
import { ReportContentResponseDto } from '../dto/report-content-response.dto';

@ApiTags('admin-reports')
@Controller('admin/reports')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard) // Protect all admin endpoints with JWT auth
export class AdminReportController {
  private readonly logger = new Logger(AdminReportController.name);

  constructor(
    private readonly reportService: ReportService,
    @Inject(UserService) private readonly userService: UserService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(IdentityCardService) private readonly identityCardService: IdentityCardService,
    private readonly configService: ConfigService,
  ) {}

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

  @Post('generate-from-batch/:batchExecutionId')
  @ApiOperation({ summary: 'Generate a report from a batch execution without sending an email' })
  @ApiParam({ name: 'batchExecutionId', description: 'The ID of the batch execution' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    type: ReportContentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Batch execution not found' })
  async generateReportFromBatch(@Param('batchExecutionId') batchExecutionId: string) {
    try {
      this.logger.log(`Generating report from batch execution ${batchExecutionId} without email`);

      // Generate the report from the batch execution without sending an email
      const report = await this.reportService.saveReportFromBatchExecutionNoEmail(batchExecutionId);

      this.logger.log(
        `Successfully generated report ${report.id} from batch execution ${batchExecutionId}`,
      );

      return {
        id: report.id,
        companyId: report.companyId,
        generatedAt: report.generatedAt,
        weekStart: report.weekStart,
        message: `Report generated successfully from batch execution ${batchExecutionId}`,
      };
    } catch (error) {
      this.logger.error(`Failed to generate report from batch: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to generate report: ${error.message}`);
    }
  }

  @Post('generate-token/:reportId')
  @ApiOperation({ summary: 'Generate a token for a specific report - Admin view' })
  @ApiParam({ name: 'reportId', description: 'The ID of the report' })
  @ApiResponse({
    status: 200,
    description: 'Token generated successfully',
    type: ReportTokenDebugResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async generateReportToken(@Param('reportId') reportId: string): Promise<ReportTokenDebugResponseDto> {
    try {
      this.logger.log(`Admin generating token for report ${reportId}`);

      // 1. Get the report to find the company ID
      const report = await this.reportService.getReportById(reportId);
      if (!report) {
        throw new NotFoundException(`Report not found with ID ${reportId}`);
      }

      const companyId = report.companyId;
      this.logger.log(`Report ${reportId} belongs to company ${companyId}`);

      // 2. Find the identity card to get the owner's user ID
      const identityCard = await this.identityCardService.findById(companyId);
      if (!identityCard || !identityCard.userId) {
        throw new BadRequestException(`No user associated with company ${companyId}`);
      }

      const userId = identityCard.userId;
      this.logger.log(`Company ${companyId} is owned by user ${userId}`);

      // 3. Generate token for this user
      const token = await this.tokenService.generateAccessToken(userId);

      // 4. Construct the access URL
      const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
      const accessUrl = `${baseUrl}/report-access?token=${token}&reportId=${reportId}`;

      this.logger.log(`Generated token for report ${reportId}: ${token.substring(0, 8)}...`);

      return {
        token,
        accessUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to generate report token: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to generate token: ${error.message}`);
    }
  }
}
