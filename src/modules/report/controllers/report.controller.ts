import { Controller, Get, Param, UseInterceptors, ClassSerializerInterceptor, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ReportService } from '../services/report.service';
import { WeeklyReportResponseDto } from '../dto/weekly-report-response.dto';

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
}