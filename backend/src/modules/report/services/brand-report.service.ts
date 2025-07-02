import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { BrandReportResponseDto } from '../dto/brand-report-response.dto';
import { AggregatedReportQueryDto } from '../dto/aggregated-report-query.dto';
import { AggregatedVisibilityResponseDto } from '../dto/aggregated-visibility-response.dto';
import { AggregatedAlignmentResponseDto } from '../dto/aggregated-alignment-response.dto';
import { AggregatedSentimentResponseDto } from '../dto/aggregated-sentiment-response.dto';
import { AggregatedExplorerResponseDto } from '../dto/aggregated-explorer-response.dto';
import { AggregatedCompetitionResponseDto } from '../dto/aggregated-competition-response.dto';
import { AggregatedCitationsDto } from '../dto/citation-item.dto';

// Import the new services
import { BrandReportQueryService } from './brand-report-query.service';
import { BrandReportMapperService } from './brand-report-mapper.service';
import { BrandReportCitationExtractorService } from './brand-report-citation-extractor.service';
import { BrandReportVariationCalculatorService } from './brand-report-variation-calculator.service';
import { BrandReportVisibilityAggregationService } from './brand-report-visibility-aggregation.service';
import { BrandReportAlignmentAggregationService } from './brand-report-alignment-aggregation.service';
import { BrandReportSentimentAggregationService } from './brand-report-sentiment-aggregation.service';
import { BrandReportCompetitionAggregationService } from './brand-report-competition-aggregation.service';
import { BrandReportExplorerAggregationService } from './brand-report-explorer-aggregation.service';
import { ProjectService } from '../../project/services/project.service';
import { UserService } from '../../user/services/user.service';

/**
 * Main service for brand report operations
 * Orchestrates the various specialized services
 */
@Injectable()
export class BrandReportService {
  private readonly logger = new Logger(BrandReportService.name);

  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
    private queryService: BrandReportQueryService,
    private mapperService: BrandReportMapperService,
    private citationExtractor: BrandReportCitationExtractorService,
    private variationCalculator: BrandReportVariationCalculatorService,
    private visibilityAggregation: BrandReportVisibilityAggregationService,
    private alignmentAggregation: BrandReportAlignmentAggregationService,
    private sentimentAggregation: BrandReportSentimentAggregationService,
    private competitionAggregation: BrandReportCompetitionAggregationService,
    private explorerAggregation: BrandReportExplorerAggregationService,
    private projectService: ProjectService,
    private userService: UserService,
  ) {}

  /**
   * Validates that a user has access to a project based on organization ownership
   * @param projectId - The project ID to validate
   * @param userId - The user ID to validate access for
   * @throws UnauthorizedException if the user doesn't have access
   */
  private async validateProjectAccess(projectId: string, userId: string): Promise<void> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.organizationId !== user.organizationId) {
      this.logger.warn(
        `User ${userId} attempted to access project ${projectId} from different organization`,
      );
      throw new UnauthorizedException('You do not have permission to access this project');
    }
  }

  /**
   * Validates that a user has access to a report based on project organization ownership
   * @param reportId - The report ID to validate
   * @param userId - The user ID to validate access for
   * @returns The report if access is granted
   * @throws UnauthorizedException if the user doesn't have access
   */
  async validateReportAccess(reportId: string, userId: string): Promise<any> {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('projectId')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    await this.validateProjectAccess(report.projectId, userId);
    return report;
  }

  // Delegate to query service with optional authorization
  async getProjectReports(
    projectId: string,
    limit: number = 10,
    userId?: string
  ): Promise<BrandReportResponseDto[]> {
    if (userId) {
      await this.validateProjectAccess(projectId, userId);
    }
    return this.queryService.getProjectReports(projectId, limit);
  }

  async getReport(reportId: string, userId?: string): Promise<BrandReportResponseDto> {
    if (userId) {
      await this.validateReportAccess(reportId, userId);
    }
    return this.queryService.getReport(reportId);
  }

  async getExplorerData(reportId: string, userId?: string) {
    if (userId) {
      await this.validateReportAccess(reportId, userId);
    }
    return this.queryService.getExplorerData(reportId);
  }

  async getVisibilityData(reportId: string, userId?: string) {
    if (userId) {
      await this.validateReportAccess(reportId, userId);
    }
    return this.queryService.getVisibilityData(reportId);
  }

  async getSentimentData(reportId: string, userId?: string) {
    if (userId) {
      await this.validateReportAccess(reportId, userId);
    }
    return this.queryService.getSentimentData(reportId);
  }

  async getAlignmentData(reportId: string, userId?: string) {
    if (userId) {
      await this.validateReportAccess(reportId, userId);
    }
    return this.queryService.getAlignmentData(reportId);
  }

  async getCompetitionData(reportId: string, userId?: string) {
    if (userId) {
      await this.validateReportAccess(reportId, userId);
    }
    
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('competition')
      .lean();

    if (!report || !report.competition) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    // Extract citations if detailed results exist
    let citations: AggregatedCitationsDto | undefined;
    if (report.competition.detailedResults) {
      citations = this.citationExtractor.extractCitationsFromCompetition(
        report.competition.detailedResults
      );
    }

    return {
      ...report.competition,
      citations
    };
  }

  // Delegate to visibility aggregation service with optional authorization
  async getAggregatedVisibility(
    projectId: string,
    query: AggregatedReportQueryDto,
    userId?: string
  ): Promise<AggregatedVisibilityResponseDto> {
    if (userId) {
      await this.validateProjectAccess(projectId, userId);
    }
    return this.visibilityAggregation.getAggregatedVisibility(projectId, query);
  }

  // Delegate to aggregation services with optional authorization
  async getAggregatedAlignment(
    projectId: string,
    query: AggregatedReportQueryDto,
    userId?: string
  ): Promise<AggregatedAlignmentResponseDto> {
    if (userId) {
      await this.validateProjectAccess(projectId, userId);
    }
    return this.alignmentAggregation.getAggregatedAlignment(projectId, query);
  }

  async getAggregatedSentiment(
    projectId: string,
    query: AggregatedReportQueryDto,
    userId?: string
  ): Promise<AggregatedSentimentResponseDto> {
    if (userId) {
      await this.validateProjectAccess(projectId, userId);
    }
    return this.sentimentAggregation.getAggregatedSentiment(projectId, query);
  }

  async getAggregatedCompetition(
    projectId: string,
    query: AggregatedReportQueryDto,
    userId?: string
  ): Promise<AggregatedCompetitionResponseDto> {
    if (userId) {
      await this.validateProjectAccess(projectId, userId);
    }
    return this.competitionAggregation.getAggregatedCompetition(projectId, query);
  }

  async getAggregatedExplorer(
    projectId: string,
    query: AggregatedReportQueryDto,
    userId?: string
  ): Promise<AggregatedExplorerResponseDto> {
    if (userId) {
      await this.validateProjectAccess(projectId, userId);
    }
    return this.explorerAggregation.getAggregatedExplorer(projectId, query);
  }

  @OnEvent('project.deleted')
  async handleProjectDeleted(event: { projectId: string }) {
    const { projectId } = event;
    try {
      const result = await this.brandReportModel.deleteMany({ projectId });
      this.logger.log(`Deleted ${result.deletedCount} brand reports for project ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to delete brand reports for project ${projectId}`, error);
    }
  }
}