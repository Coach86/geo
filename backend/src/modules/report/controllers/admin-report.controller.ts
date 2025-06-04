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
import { ProjectService } from '../../project/services/project.service';
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
    @Inject(ProjectService) private readonly projectService: ProjectService,
    private readonly configService: ConfigService,
  ) {}

  @Get(':projectId/all')
  @ApiOperation({ summary: 'Get all reports for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 200,
    description: 'All reports for the project have been successfully retrieved.',
    type: CompanyReportsResponseDto,
  })
  async getAllProjectReports(@Param('projectId') projectId: string) {
    return this.reportService.getAllProjectReports(projectId);
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
      if (!emailDto.reportId || !emailDto.projectId || !emailDto.email) {
        throw new BadRequestException('Report ID, project ID, and email are required');
      }

      // Send the email
      const result = await this.reportService.sendReportEmailToAddress(
        emailDto.reportId,
        emailDto.projectId,
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
        projectId: report.projectId,
        generatedAt: report.generatedAt,
        date: report.date,
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
  async generateReportToken(
    @Param('reportId') reportId: string,
  ): Promise<ReportTokenDebugResponseDto> {
    try {
      this.logger.log(`Admin generating token for report ${reportId}`);

      // 1. Get the report to find the company ID
      const report = await this.reportService.getReportById(reportId);
      if (!report) {
        throw new NotFoundException(`Report not found with ID ${reportId}`);
      }

      const projectId = report.projectId;
      this.logger.log(`Report ${reportId} belongs to project ${projectId}`);

      // 2. Find the project to get the organization ID
      const project = await this.projectService.findById(projectId);
      if (!project || !project.organizationId) {
        throw new BadRequestException(`No organization associated with project ${projectId}`);
      }

      const organizationId = project.organizationId;
      this.logger.log(`Project ${projectId} belongs to organization ${organizationId}`);

      // 3. Generate token for this organization
      // TODO: Need to update token generation to work with organizations
      const token = 'temp-token'; // await this.tokenService.generateAccessToken(organizationId);

      // 4. Construct the access URL
      const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
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
